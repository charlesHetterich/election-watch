import { describe, expect, it, MockInstance, vi } from "vitest";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { LambdaApp, loadApps } from "@lambdas/app-handler";
import { appsDir, mockClient } from "./mock";
import { MultiAddress } from "@polkadot-api/descriptors";
import fs from "fs";
import path from "path";
import { TAppModule, TRoute } from "@lambdas/app-support";
import { getPolkadotSigner } from "polkadot-api/signer";

function getNewSigner() {
    const mnemonic = mnemonicGenerate();
    const keyring = new Keyring({ type: "sr25519" });
    const pair = keyring.addFromUri("//Alice", /*meta*/ {}, "sr25519");
    // const miniSecret = entropyToMiniSecret(mnemonicToEntropy(DEV_PHRASE));
    // const derive = sr25519CreateDerive(miniSecret);
    // const keypair = derive("//Alice");
    return {
        address: pair.address,
        signer: getPolkadotSigner(
            pair.publicKey,
            "Sr25519",
            (data: Uint8Array) => pair.sign(data)
        ),
    };
}

function _getNewSigner() {
    // Generate the key using hdkd
    // const miniSecret = entropyToMiniSecret(mnemonicToEntropy(DEV_PHRASE));
    // const derive = sr25519CreateDerive(miniSecret);
    // const keypair = derive("//Alice");

    // // Convert to a format that polkadot-api expects
    // return getPolkadotSigner(keypair.publicKey, "Sr25519", keypair.sign);
    const keyring = new Keyring({ type: "sr25519" });
    // Add Alice using the development mnemonic
    const alice = keyring.addFromUri("//Alice");
    return alice;
}

/**
 * Get the routes for all valid apps that have valid trigger/lambda functions
 */
async function getSpiedOnRoutes() {
    const appNames = fs
        .readdirSync(appsDir, { withFileTypes: true })
        .filter(
            (dirent) => dirent.isDirectory() && !dirent.name.startsWith("_")
        )
        .map((dirent) => dirent.name);

    const result = await appNames.reduce(async (accPromise, appName) => {
        const acc = await accPromise;
        try {
            const appModule = (
                await import(path.join(appsDir, appName, "index.ts"))
            ).default as TAppModule<string[]>;

            acc[appName] = appModule.routes.map((route) => {
                return {
                    trigger: vi.spyOn(route, "trigger"),
                    lambda: vi.spyOn(route, "lambda"),
                };
            });
        } catch (_) {}
        return acc;
    }, Promise.resolve({} as Record<string, { trigger: MockInstance; lambda: MockInstance }[]>));

    return result;
}

describe("Substrate Lambdas Client", async () => {
    const client = await mockClient();

    describe("loader", async () => {
        it("should throw an error on non-existed appsDir", async () => {
            await expect(() =>
                loadApps(client, "invalid-path")
            ).rejects.toBeDefined();
        });

        it("should find apps in valid `appsDir` correctly", async () => {
            const manager = await loadApps(client, appsDir);
            expect(manager).toBeDefined();
            expect(manager["apps"].map((app) => app.name)).toContain(
                "no-index"
            );
        });

        it("should load all valid/invalid apps correctly", async () => {
            // Load all apps
            const manager = await loadApps(client, appsDir);
            const apps = manager["apps"].reduce((acc, app) => {
                acc[app.name] = app;
                return acc;
            }, {}) as Record<string, LambdaApp>;

            // Check simple invalid apps
            expect(apps["no-index"].name).toEqual("no-index");
            expect(apps["no-index"].alive).toBe(false);
            expect(apps["no-index"].handlers).toBeNull();
            expect(apps["invalid-module"].alive).toBe(false);
            expect(apps["invalid-module"].handlers).toBeNull();

            // Check simple valid apps
            expect(apps["single-event"].name).toEqual("single-event");
            expect(apps["single-event"].alive).toBe(true);
            expect(apps["single-event"].handlers).toHaveLength(1);
            expect(apps["single-query"].alive).toBe(true);
            expect(apps["single-query"].handlers).toHaveLength(1);
        });
    });

    describe("loaded apps", async () => {
        const routes = await getSpiedOnRoutes();
        const alice = getNewSigner();
        const bob = getNewSigner();

        const manager = await loadApps(client, appsDir);
        const apps = manager["apps"].reduce((acc, app) => {
            acc[app.name] = app;
            return acc;
        }, {}) as Record<string, LambdaApp>;

        it("should react to the Observable they are watching", async () => {
            console.log("HELLOOO");

            await manager.launch();
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // manager["api"].apis.

            // await new Promise((resolve) => setTimeout(resolve, 4000));
            manager["api"].event.Balances.Transfer.watch().subscribe((e) => {
                console.log("Event triggered");
                console.log(e);
            });

            manager["api"].tx.Balances.transfer_allow_death({
                // source: MultiAddress.Id(alice.address),
                dest: MultiAddress.Id(bob.address),
                value: 1000n,
            }).signAndSubmit(alice.signer);
            // .subscribe({
            //     next: (e) => {
            //         console.log(e.type);
            //         if (e.type === "txBestBlocksState") {
            //             console.log(
            //                 "The tx is now in a best block, check it out:"
            //             );
            //             console.log(
            //                 `https://localhost:8000/extrinsic/${e.txHash}`
            //             );
            //         }
            //     },
            //     error: console.error,
            //     complete() {
            //         // client.destroy();
            //         // smoldot.terminate();
            //     },
            // });

            // expect(MultiAddress.Id(alice.publicKey.toString())).toContain("5");
            // const alicePublicKeyHex = Buffer.from(
            //     alice.publicKey.buffer
            // ).toString("hex");
            // expect(alice).toEqual("0a"); // Assuming 10 in hex is "0a"
            // expect(alice.address).toEqual(
            //     "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
            // ); // Replace with actual address
            // expect(
            //     await manager["api"].query.System.Account.getValue(
            //         alice.address
            //     )
            // ).toEqual(1000n);
            // vi.spy;
            // await new Promise((resolve) => setTimeout(resolve, 2000));
            // routes["single-event"][0].trigger.mockClear();
            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(routes["single-event"][0].trigger).toHaveBeenCalledOnce();
        });
    });
});
