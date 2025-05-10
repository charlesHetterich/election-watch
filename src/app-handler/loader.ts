import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PolkadotClient, TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";

import { LambdaApp, RouteHandler, WatchType } from "./app";
import { AppManager } from "./manager";
import { TAppModule, TRoute } from "../app-support/type-helper";

/**
 * Creates a route handler from a route and an API
 */
function handlerFromRoute(
    route: TRoute<any>,
    api: TypedApi<typeof dot>
): RouteHandler {
    // Find raw watchable value
    const pth_arr = route.watching.split(".");
    let watchable: any = api; // TODO! remove any
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
 * @returns The `MetaApp` of a *loaded or failed* app
 */
async function loadApp(
    appsDir: string,
    appName: string,
    api: TypedApi<typeof dot>
): Promise<LambdaApp> {
    let app = new LambdaApp(appName, "", true, [], null, []);
    try {
        // Load & expect `TAppModule`
        const appModule = (
            await import(path.join(appsDir, appName, "index.ts"))
        ).default as TAppModule<string[]>;

        // Configure application from module
        app.description = appModule.description.trim();
        app.watchPaths = [
            ...new Set(appModule.routes.map((route) => route.watching)),
        ];
        app.handlers = appModule.routes.map((route) =>
            handlerFromRoute(route, api)
        );
    } catch (e) {
        app.alive = false;
        app.logs.push(`Error loading ${appName}: ${e.stack}`);
    }
    return app;
}

/**
 * Load all apps from the `apps` directory
 *
 * @returns `AppManager` containing all apps
 */
export async function loadApps(
    client: PolkadotClient,
    appsDir: string
): Promise<AppManager> {
    // TODO!
    // eventually which API(s) we load will be given by each app
    // - - - -
    const papi = client.getTypedApi(dot);
    // - - - -

    // Load all apps
    let apps: LambdaApp[] = [];
    if (fs.existsSync(appsDir)) {
        const appNames = fs
            .readdirSync(appsDir, { withFileTypes: true })
            .filter(
                (dirent) => dirent.isDirectory() && !dirent.name.startsWith("_")
            )
            .map((dirent) => dirent.name);
        apps = await Promise.all(
            appNames.map((appName) => loadApp(appsDir, appName, papi))
        );
    } else {
        throw new Error(`Apps directory ${appsDir} not found.`);
    }

    // Create & return app manager
    return new AppManager(apps, papi);
}
