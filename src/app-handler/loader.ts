import fs from "fs";
import path from "path";
import { Subscription } from "rxjs";
import * as D from "@polkadot-api/descriptors";
import { getTypedCodecs } from "polkadot-api";

import {
    Context,
    WatchLeaf,
    TAppModule,
    TRoute,
    ChainId,
    ROOTS,
} from "@lambdas/app-support";
import { LambdaApp, RouteHandler, WatchType } from "./app";
import { AppsManager } from "./manager";

/**
 * Creates a route handler from a route and an API
 *
 * TODO! refactor & better types. whole thing needs
 *       to be validated w/ integration tests next.
 */
async function handlerFromRoute<WLs extends WatchLeaf[]>(
    route: TRoute<WLs>,
    manager: AppsManager
): Promise<RouteHandler> {
    let leafHandlers: ((
        context: Context<ChainId>
    ) => [WatchLeaf, Subscription])[] = [];
    for (const leaf of route.watching) {
        const path_arr = leaf.path.split(".");

        // Start at the top this chain's API/Codec, and then
        // traverse properties to the desired observable value
        let watchable: any = await manager.getAPI(leaf.chain);
        let codec: any = await getTypedCodecs(D[leaf.chain]);
        for (const pth of path_arr) {
            watchable = watchable[pth == WatchType.STORAGE ? "query" : pth];
            codec = codec[pth == WatchType.STORAGE ? "query" : pth];
        }

        // Configure route handler
        switch (path_arr[0]) {
            case WatchType.EVENT:
                leafHandlers.push((context: Context<ChainId>) => [
                    leaf,
                    ROOTS.event.handleLeaf(
                        watchable,
                        route.trigger,
                        route.lambda,
                        leaf
                    )(context),
                ]);
                break;
            case WatchType.STORAGE:
                const nArgs: number = codec.args.inner.length;
                leafHandlers.push((context: Context<ChainId>) => [
                    leaf,
                    ROOTS.storage.handleLeaf(
                        watchable,
                        route.trigger,
                        route.lambda,
                        leaf,
                        nArgs
                    )(context),
                ]);
                break;
            default:
                throw new Error(
                    `Invalid \`Observables\` route on chain ${leaf.chain} with path ${path_arr}. Must start with "event" or "query".`
                );
        }
    }

    // Collect all leaf handlers into a single
    // "batch" handler that calls all leaf handlers
    return (context: Context<ChainId>) =>
        leafHandlers.map((handler) => handler(context));
}

/**
 * Try to load a `LambdaApp` from module given by `appName`. If any handler fails
 * to load, we consider the entire app to be failed.
 *
 * Both successful & failed apps are added to `manager`
 */
async function loadApp(
    appsDir: string,
    appName: string,
    manager: AppsManager
): Promise<LambdaApp> {
    let app = new LambdaApp(appName, "", true, [], [], []);
    try {
        // Load & expect `TAppModule`
        const appModule = (
            await import(path.join(appsDir, appName, "index.ts"))
        ).default as TAppModule<WatchLeaf[][]>;

        // Configure application from module
        app.description = appModule.description.trim();
        app.chains = appModule.routes
            .map((route) => route.watching.map((leaf) => leaf.chain))
            .flat();
        app.handlers = await Promise.all(
            appModule.routes.map(
                async (route) => await handlerFromRoute(route, manager)
            )
        );
    } catch (e: any) {
        // Mark the app as dead if any errors occur
        app.alive = false;
        app.logs.push(`Error loading ${appName}: ${e.stack}`);
    }

    // Add the app to the manager
    manager.apps.push(app);
    return app;
}

/**
 * Load all apps from the `appsDir` directory
 *
 * @returns `AppsManager` containing all apps
 */
export async function loadApps(appsDir: string, manager: AppsManager) {
    let apps: LambdaApp[] = [];
    if (fs.existsSync(appsDir)) {
        // Find all apps in `appsDir`
        const appNames = fs
            .readdirSync(appsDir, { withFileTypes: true })
            .filter((dir) => dir.isDirectory() && !dir.name.startsWith("_"))
            .map((dirent) => dirent.name);

        // Load all apps
        apps = await Promise.all(
            appNames.map((appName) => loadApp(appsDir, appName, manager))
        );
    } else {
        throw new Error(`Apps directory ${appsDir} not found.`);
    }
}

if (import.meta.vitest) {
    const { test, expect, describe } = import.meta.vitest;
    test("TODO! Implement tests", () => {
        expect("").toEqual("todo!");
    });
}
