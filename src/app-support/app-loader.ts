import fs from "fs";
import path from "path";
import chalk from "chalk";
import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";

const appsDir = path.join(__dirname, "../apps");

/**
 * Wrapper around an `observable` we would like to watch
 */
class Watching {
    /**
     * The `observable` we intend to watch
     */
    call: Function;

    /**
     * The name of the observable givenn by its call path
     */
    name: String;

    /**
     * Configure new watching
     *
     * @param callPth The call path to an `observable`. *e.x: `"event.ElectionProviderMultiPhase.PhaseTransitioned"`*
     * @param api PAPI light client.
     */
    constructor(callPth: string, api: TypedApi<typeof dot>) {
        const pth_arr = callPth.split(".");
        let call: any = api; // TODO! remove any
        for (const pth of pth_arr) {
            call = call[pth];
        }
        this.call = call["watch"];
        this.name = callPth;
    }
}

/**
 * Stores lambda app configuration
 */
export class LambdaApp {
    /**
     * The name of the app, given by the directory name
     */
    appName: String;

    /**
     * The description of the app, given by the description field in the app
     */
    description: String;

    /**
     * Configuration for the `observable` being watched
     */
    watching: Watching;

    /**
     * Filters instances of the event we are watching. Triggers `this.lambda` when true is returned
     * TODO! specify type better
     */
    trigger: Function;

    /**
     * The work to do after `this.trigger` fires
     * TODO! specify type better
     */
    lambda: Function;

    /**
     * Configure new lambda app
     *
     * @param appName The name of the app with we attempt to import
     * @param api PAPI light client.
     */
    constructor(appName: string, api: TypedApi<typeof dot>) {
        const app = require(path.join(appsDir, appName, "index.ts"));
        this.appName = appName;
        this.watching = new Watching(app.watching, api);
        this.description = app.description.trim();
        this.trigger = app.trigger;
        this.lambda = app.lambda;
    }
}

/**
 * Load all apps from the apps directory.
 */
export function loadApps(api: TypedApi<typeof dot>) {
    let apps: LambdaApp[] = [];

    if (fs.existsSync(appsDir)) {
        const appNames = fs
            .readdirSync(appsDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        appNames.forEach((appName) => {
            apps.push(new LambdaApp(appName, api));
        });
    } else {
        console.log(chalk.red("Apps directory not found."));
    }
    return apps;
}
