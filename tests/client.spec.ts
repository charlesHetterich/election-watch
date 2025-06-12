import { beforeAll, describe, expect, it } from "vitest";
import { MultiAddress } from "@polkadot-api/descriptors";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { Binary } from "polkadot-api";
import { AppsManager, loadApps } from "@lambdas/app-handler";
import { getSigner, getSpiedOnRoutes, clearRouteMocks } from "./helpers";
import { appsDir, mockGetAPI } from "./mock";

describe("Substrate Lambdas Client", async () => {
    await cryptoWaitReady();

    let manager: AppsManager;
    let routes = await getSpiedOnRoutes();
    const alice = getSigner("Alice");
    const bob = getSigner("Bob");

    describe("Routes", async () => {
        beforeAll(async () => {
            if (manager) {
                await manager.shutdown();
            }
            manager = new AppsManager();
            manager.getAPI = mockGetAPI;
            await loadApps(appsDir, manager);
            await manager.launch();

            // Submit a series of transaction which the upcoming tests will use
            // [1] submit a tranfer from Alice to Bob
            await manager["apis"].polkadot.tx.Balances.transfer_allow_death({
                dest: MultiAddress.Id(bob.address),
                value: 10_000_000_000n,
            }).signAndSubmit(alice.signer);
            // [2] submit another tranfer from Alice to Bob
            await manager["apis"].polkadot.tx.Balances.transfer_allow_death({
                dest: MultiAddress.Id(bob.address),
                value: 40_000_000_000n,
            }).signAndSubmit(alice.signer);
            // [3] submit a remark from Alice
            await manager["apis"].polkadot.tx.System.remark({
                remark: Binary.fromText(""),
            }).signAndSubmit(alice.signer);
        }, 30000);

        it("should handle event observables", async () => {
            expect(routes["simple-event"][0].trigger).toHaveBeenCalledTimes(2);
            expect(
                routes["simple-event"][0].trigger.mock.calls[0][0].amount
            ).toEqual(10_000_000_000n);
        });

        it("should only get to lambda when the trigger returns true", async () => {
            expect(routes["complex-routes"][2].trigger).toHaveBeenCalledTimes(
                2
            );
            expect(routes["complex-routes"][2].lambda).toHaveBeenCalledTimes(1);
        });

        it("`.all()` should capture all events within a pallet when used at the pallet level", async () => {
            const paths = routes["complex-routes"][0].trigger.mock.calls.map(
                (call) => call[0].__meta.path
            ) as string[];
            expect(paths).toContain("event.Balances.Transfer");
            expect(paths).toContain("event.Balances.Deposit");
            expect(paths).toContain("event.Balances.Withdraw");
        });

        it("`.all()` should capture all events across pallets when used at chain level", async () => {
            const paths = routes["complex-routes"][1].trigger.mock.calls.map(
                (call) => call[0].__meta.path
            ) as string[];
            expect(paths).toContain("event.Balances.Transfer");
            expect(paths).toContain("event.Balances.Deposit");
            expect(paths).toContain("event.Balances.Withdraw");
            expect(paths).toContain("event.System.ExtrinsicSuccess");
        });

        it("should handle storage observables with no keys", async () => {
            expect(routes["simple-storage"][0].trigger).toHaveBeenCalledTimes(
                4
            );
        });

        it("should handle storage observables with keys (all keys given)", async () => {
            expect(routes["simple-storage"][1].trigger).toHaveBeenCalledTimes(
                3
            );
            expect(routes["simple-storage"][2].trigger).toHaveBeenCalledTimes(
                1
            );
        });
    });
});
