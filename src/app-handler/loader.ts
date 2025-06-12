import fs from "fs";
import path from "path";
import { Subscription } from "rxjs";

import {
    Context,
    WatchLeaf,
    TAppModule,
    TRoute,
    ROOTS,
} from "@lambdas/app-support";
import { LambdaApp, RouteHandler, WatchType } from "./app";
import { AppsManager } from "./manager";

/**
 * Creates a route handler from a route and an API
 */
async function handlerFromRoute<WLs extends WatchLeaf[]>(
    route: TRoute<WLs>,
    manager: AppsManager
): Promise<RouteHandler> {
    let leafHandlers: ((context: Context) => [WatchLeaf, Subscription])[] = [];
    for (const leaf of route.watching) {
        const path_arr = leaf.path.split(".");

        // Start at the top this chain's API/Codec, and then
        // traverse properties to the desired observable value
        let watchable: any = await manager.getAPI(leaf.chain);
        let codec: any = await manager.getCodec(leaf.chain);
        for (const pth of path_arr) {
            watchable = watchable[pth == WatchType.STORAGE ? "query" : pth];
            codec = codec[pth == WatchType.STORAGE ? "query" : pth];
        }

        // Configure route handler
        switch (path_arr[0]) {
            case WatchType.EVENT:
                leafHandlers.push((context: Context) => [
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
                leafHandlers.push((context: Context) => [
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
    return (context: Context) =>
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
    const { test, expect } = import.meta.vitest;
    const appsDir = "tests/mock-apps";

    test("should throw an error on non-existed appsDir", async () => {
        await expect(() =>
            loadApps("invalid-path", new AppsManager())
        ).rejects.toBeDefined();
    });

    test("should find apps in valid `appsDir` correctly", async () => {
        const manager = new AppsManager();
        await loadApps(appsDir, manager);
        expect(manager["apps"].map((app) => app.name)).toContain("no-index");
    });

    test("should load all valid/invalid apps correctly", async () => {
        const manager = new AppsManager();
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
        expect(apps["simple-event"].name).toEqual("simple-event");
        expect(apps["simple-event"].alive).toBe(true);
        expect(apps["simple-event"].handlers).toHaveLength(1);
        expect(apps["simple-storage"].alive).toBe(true);
        expect(apps["simple-storage"].handlers).toHaveLength(3);
    });
}
