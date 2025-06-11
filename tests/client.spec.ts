import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MultiAddress } from "@polkadot-api/descriptors";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { Binary } from "polkadot-api";

import { AppsManager, LambdaApp, loadApps } from "@lambdas/app-handler";
import { getSigner, getSpiedOnRoutes, clearRouteMocks } from "./helpers";
import { appsDir, mockGetAPI } from "./mock";

describe("Substrate Lambdas Client", async () => {
    let manager: AppsManager;
    let routes = await getSpiedOnRoutes();
    const alice = getSigner("Alice");
    const bob = getSigner("Bob");

    beforeAll(async () => {
        await cryptoWaitReady();
    }, 20000);

    describe("loader", async () => {
        beforeEach(() => {
            manager = new AppsManager();
        });

        it("should throw an error on non-existed appsDir", async () => {
            await expect(() =>
                loadApps("invalid-path", manager)
            ).rejects.toBeDefined();
        });

        it("should find apps in valid `appsDir` correctly", async () => {
            await loadApps(appsDir, manager);
            expect(manager["apps"].map((app) => app.name)).toContain(
                "no-index"
            );
        });

        it("should load all valid/invalid apps correctly", async () => {
            // Load all apps
            await loadApps(appsDir, manager);
            const apps = manager["apps"].reduce((acc, app) => {
                acc[app.name] = app;
                return acc;
            }, {} as Record<string, LambdaApp>);

            // Check simple invalid apps
            expect(apps["no-index"].name).toEqual("no-index");
            expect(apps["no-index"].alive).toBe(false);
            expect(apps["no-index"].handlers).toHaveLength(0);
            expect(apps["invalid-module"].alive).toBe(false);
            expect(apps["invalid-module"].handlers).toHaveLength(0);

            // Check simple valid apps
            expect(apps["single-event"].name).toEqual("single-event");
            expect(apps["single-event"].alive).toBe(true);
            expect(apps["single-event"].handlers).toHaveLength(1);
            expect(apps["single-query"].alive).toBe(true);
            // expect(apps["single-query"].handlers).toHaveLength(4);
        });
    });

    describe("Routes", async () => {
        beforeAll(async () => {
            if (manager) {
                await manager.shutdown();
            }
            manager = new AppsManager();
            manager.getAPI = mockGetAPI;
            await loadApps(appsDir, manager);
            await manager.launch();
            await manager["apis"].polkadot.tx.System.remark({
                remark: Binary.fromText("hello"),
            }).signAndSubmit(alice.signer);
            clearRouteMocks(routes);

            // Submit a series of transaction which the upcoming tests will use
            // [1] submit a tranfer from Alice to Bob
            await manager["apis"].polkadot.tx.Balances.transfer_allow_death({
                dest: MultiAddress.Id(bob.address),
                value: 10_000_000_000n,
            }).signAndSubmit(alice.signer);
            // [2] submit a remark from Alice
            await manager["apis"].polkadot.tx.System.remark({
                remark: Binary.fromText(""),
            }).signAndSubmit(alice.signer);
            // [1] submit a tranfer from Alice to Bob
            await manager["apis"].polkadot.tx.Balances.transfer_allow_death({
                dest: MultiAddress.Id(bob.address),
                value: 40_000_000_000n,
            }).signAndSubmit(alice.signer);
        }, 20000);

        it("should handle event observables", async () => {
            expect(routes["single-event"][0].trigger).toHaveBeenCalledTimes(2);
            expect(
                routes["single-event"][0].trigger.mock.calls[0][0].amount
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
            expect(routes["single-query"][0].trigger).toHaveBeenCalledTimes(3);
        });

        it.todo(
            "should handle `Observables.storage` leaves and give payload in expected format, regardless of `.watchEntries` or `.watchValue`",
            async () => {
                expect.fail("not implemented");
            }
        );
        it.todo(
            "should filter `delete`, `upsert` payloads on `Observables.storage` according to `WatchLeaf.options`",
            async () => {
                expect.fail("not implemented");
            }
        );
    });
});
