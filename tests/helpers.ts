import fs from "fs";
import path from "path";
import { MockInstance, vi } from "vitest";
import { Keyring } from "@polkadot/api";
import { getPolkadotSigner } from "polkadot-api/signer";

import { AppModule, WatchLeaf } from "@lambdas/app-support";
import { appsDir } from "./mock";

export function getSigner(seed: string) {
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
export async function getSpiedOnRoutes() {
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
            ).default as AppModule<WatchLeaf[][]>;

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

export function clearRouteMocks(
    routes: Record<string, { trigger: MockInstance; lambda: MockInstance }[]>
) {
    for (const appName of Object.keys(routes)) {
        routes[appName].forEach((route) => {
            route.trigger = route.trigger.mockClear();
            route.lambda = route.lambda.mockClear();
        });
    }
}
