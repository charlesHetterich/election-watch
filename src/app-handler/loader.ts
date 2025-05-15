import fs from "fs";
import path from "path";
import { TypedApi } from "polkadot-api";

import { LambdaApp, RouteHandler, WatchType } from "./app";
import { AppsManager } from "./manager";
import { WatchPath, TAppModule, TRoute } from "../app-support/types";

/**
 * Creates a route handler from a route and an API
 */
async function handlerFromRoute<WP extends WatchPath>(
    route: TRoute<WP>,
    manager: AppsManager
): Promise<RouteHandler> {
    // NOTE! we will likely move position of chain ID in
    //       which case this also needs to be updated
    const watching_tuple = route.watching.split(".");
    const chainID = watching_tuple[0];
    const pth_arr = watching_tuple.slice(1);

    // Start at the top this chain's API, and then
    // traverse properties to the desired observable value
    let watchable: any = await manager.getAPI(chainID);
    for (const pth of pth_arr) {
        watchable = watchable[pth];
    }

    // Configure route handler
    switch (pth_arr[0]) {
        case WatchType.EVENT:
            return (context) => {
                watchable.watch().forEach(async (data) => {
                    if (await route.trigger(data.payload, context)) {
                        route.lambda(data.payload, context);
                    }
                });
            };
        case WatchType.QUERY:
            return (context) => {
                watchable.watchValue().forEach(async (payload) => {
                    if (await route.trigger(payload, context)) {
                        route.lambda(payload, context);
                    }
                });
            };
        default:
            throw new Error(
                `Invalid call path ${route.watching}. Must start with "event" or "query".`
            );
    }
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
    let app = new LambdaApp(appName, "", true, [], null, []);
    try {
        // Load & expect `TAppModule`
        const appModule = (
            await import(path.join(appsDir, appName, "index.ts"))
        ).default as TAppModule<WatchPath[]>;

        // Configure application from module
        app.description = appModule.description.trim();
        app.watchPaths = [
            ...new Set(appModule.routes.map((route) => route.watching)),
        ];
        app.handlers = await Promise.all(
            appModule.routes.map(
                async (route) => await handlerFromRoute(route, manager)
            )
        );
    } catch (e) {
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
            .filter(
                (dirent) => dirent.isDirectory() && !dirent.name.startsWith("_")
            )
            .map((dirent) => dirent.name);

        // Load all apps
        apps = await Promise.all(
            appNames.map((appName) => loadApp(appsDir, appName, manager))
        );
    } else {
        throw new Error(`Apps directory ${appsDir} not found.`);
    }
}
