import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest";
import { Keyring } from "@polkadot/api";
import { AppsManager, LambdaApp, loadApps } from "@lambdas/app-handler";
import { appsDir, mockGetAPI } from "./mock";
import { MultiAddress } from "@polkadot-api/descriptors";
import fs from "fs";
import path from "path";
import { TAppModule, WatchPath } from "@lambdas/app-support";
import { getPolkadotSigner } from "polkadot-api/signer";
import { Binary } from "polkadot-api";
import { cryptoWaitReady } from "@polkadot/util-crypto";

function getNewSigner(seed: string) {
    const keyring = new Keyring({ type: "sr25519" });
    const pair = keyring.addFromUri(`//${seed}`, {}, "sr25519");
    return {
        address: pair.address,
        signer: getPolkadotSigner(
            pair.publicKey,
            "Sr25519",
            (data: Uint8Array) => pair.sign(data)
        ),
    };
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
            ).default as TAppModule<WatchPath[]>;

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
    beforeAll(async () => {
        await cryptoWaitReady();
    }, 20000);

    describe("loader", async () => {
        let manager: AppsManager;
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
        const alice = getNewSigner("Alice");
        const bob = getNewSigner("Bob");
        const manager = new AppsManager();
        manager.getAPI = mockGetAPI;

        await loadApps(appsDir, manager);
        const apps = manager["apps"].reduce((acc, app) => {
            acc[app.name] = app;
            return acc;
        }, {}) as Record<string, LambdaApp>;

        beforeAll(async () => {
            // Submit a remark block so we start listening to events during a *mostly* empty block
            await manager["apis"].polkadot.tx.System.remark({
                remark: Binary.fromText("hello"),
            }).signAndSubmit(alice.signer);
            await manager.launch();
        }, 20000);

        it("should react to the Observable they are watching", async () => {
            await manager["apis"].polkadot.tx.Balances.transfer_allow_death({
                dest: MultiAddress.Id(bob.address),
                value: 10_000_000_000n,
            }).signAndSubmit(alice.signer);
            expect(routes["single-event"][0].trigger).toHaveBeenCalledOnce();
            expect(
                routes["single-event"][0].trigger.mock.calls[0][0].amount
            ).toEqual(10_000_000_000n);
        });
    });
});
