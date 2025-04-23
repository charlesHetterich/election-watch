import fs from "fs";
import path from "path";
import chalk from "chalk";
import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";
import { Context } from "../context";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot"; // Can select other chains (kusama, westend, etc. here)
import { start } from "polkadot-api/smoldot";

import { AppModule, Watching, MetaApp } from "./app";
import { AppManager } from "./manager";

const appsDir = path.join(process.cwd(), "src/apps");
// TODO! decide if I want something like this which would make apps visible at compile-time (not so sure this is useful though...)
// > the main help this offers is type-checking of modules @ compile-time, instead of them blowing up when they actually trigger
// const modules = import.meta.glob("../apps/**/index.ts", { eager: true });

/**
 * Try to load a `LambdaApp` from module given by `appName`
 *
 * @returns The `MetaApp` of a *loaded or failed* app
 */
function loadApp(appName: string, api: TypedApi<typeof dot>): MetaApp {
    try {
        const { watching, description, trigger, lambda } = require(path.join(
            appsDir,
            appName,
            "index.ts"
        )) as AppModule;
        return new MetaApp(
            appName,
            {
                description: description.trim(),
                watching: new Watching(watching, api),
                trigger: trigger,
                lambda: lambda,
            },
            true
        );
    } catch (e) {
        return new MetaApp(appName, undefined, false, [e.message]);
    }
}

/**
 * Load all apps from the `apps` directory
 *
 * @returns `AppManager` containing all apps
 */
export async function loadApps() {
    // Create our light client
    // TODO! in the future we should have a dynamic set of apis given by which
    //       chains each app expects
    const smoldot = start();
    const chain = await smoldot.addChain({ chainSpec });
    const client = createClient(getSmProvider(chain));
    const papi = client.getTypedApi(dot);

    // Load all apps
    let apps: MetaApp[] = [];
    if (fs.existsSync(appsDir)) {
        const appNames = fs
            .readdirSync(appsDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        appNames.forEach((appName) => {
            apps.push(loadApp(appName, papi));
        });
    } else {
        console.log(chalk.red("Apps directory not found."));
    }

    // Create & return app manager
    return new AppManager(apps, papi);
}
