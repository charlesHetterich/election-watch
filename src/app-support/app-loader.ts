import fs from "fs";
import path from "path";
import chalk from "chalk";
import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";
import { assert } from "console";

// TODO! decide if I want something like this which would make apps visible at compile-time (not so sure this is useful though...)
// const modules = import.meta.glob("./lambdas/**/*.ts", { eager: true });

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
    callPth: String;

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
        this.callPth = callPth;
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
    trigger: (payload, context) => boolean;

    /**
     * The work to do after `this.trigger` fires
     * TODO! specify type better
     */
    lambda: (payload, context) => void;

    /**
     * Configure new lambda app
     *
     * @param appName The name of the app with we attempt to import
     * @param api PAPI light client.
     */
    constructor(init?: Partial<LambdaApp>) {
        Object.assign(this, init);
    }
}

export class MetaApp {
    name: string;

    app: LambdaApp;
    logs: string[] = [];

    constructor(init?: Partial<MetaApp>) {
        Object.assign(this, init);
    }
}

function validate(result: boolean, e: Error) {
    if (!result) {
        throw e;
    }
}

function loadApp(appName: string, api: TypedApi<typeof dot>) {
    // Pull application components
    const { watching, description, trigger, lambda } = require(path.join(
        appsDir,
        appName,
        "index.ts"
    ));

    // TODO! Better assertions
    // - validate types exactly (given by Payload<watching>)
    // - at least validate trigger returns boolean
    validate(
        typeof watching == "string",
        TypeError(`App ${appName} does not export a string watching path`)
    );
    validate(
        typeof description == "string",
        TypeError(`App ${appName} does not export a string description`)
    );
    validate(
        trigger.length == 2,
        TypeError(`App ${appName} trigger signature incorrect`)
    );
    validate(
        lambda.length == 2,
        TypeError(`App ${appName} lambda signature incorrect`)
    );

    return new LambdaApp({
        appName: appName,
        watching: new Watching(watching, api),
        description: description.trim(),
        trigger: trigger,
        lambda: lambda,
    });
}

/**
 * Load all apps from the apps directory.
 */
export function loadApps(api: TypedApi<typeof dot>) {
    let apps: MetaApp[] = [];

    if (fs.existsSync(appsDir)) {
        const appNames = fs
            .readdirSync(appsDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        appNames.forEach((appName) => {
            try {
                const app = loadApp(appName, api);
                apps.push(
                    new MetaApp({
                        name: appName,
                        app: app,
                    })
                );
            } catch (e) {
                apps.push(
                    new MetaApp({
                        name: appName,
                        app: undefined,
                        logs: [e.message],
                    })
                );
            }
        });
    } else {
        console.log(chalk.red("Apps directory not found."));
    }
    return apps;
}
