import fs from "fs";
import path from "path";
import chalk from "chalk";
import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";
import { Context } from "./context";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot"; // Can select other chains (kusama, westend, etc. here)
import { start } from "polkadot-api/smoldot";
import { Payload } from "./type-helper";

// TODO! decide if I want something like this which would make apps visible at compile-time (not so sure this is useful though...)
// > the main help this offers is type-checking of modules @ compile-time, instead of them blowing up when they actually trigger
// const modules = import.meta.glob("./lambdas/**/*.ts", { eager: true });

const appsDir = path.join(__dirname, "../apps");

export enum WatchType {
    EVENT = "event",
    QUERY = "query",
}

/**
 * Wrapper around an `observable` we would like to watch
 */
class Watching {
    /**
     * The `observable` we intend to watch
     */
    call: Function;

    /**
     * The type of the observable
     */
    type: WatchType;

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

        switch (pth_arr[0]) {
            case "event":
                this.call = call.watch;
                this.type = WatchType.EVENT;
                break;
            case "query":
                this.call = call.watchValue;
                this.type = WatchType.QUERY;
                break;
            default:
                throw new Error(
                    `Invalid call path ${callPth}. Must start with "event" or "query".`
                );
        }
        this.callPth = callPth;
    }
}

/**
 * The expected structure of an app's exports
 *
 * @property description: The description of the app, given by the description field in the app
 * @property watching: A path to an observable in the form `path.to.observable`
 * @property trigger: Filters instances of the event we are watching. Triggers `lambda` when true is returned
 * @property lambda: The work to do after `trigger` fires
 */
type AppModule = {
    description: string;
    watching: string;
    trigger: (payload: Payload<any>, context: Context<any>) => boolean;
    lambda: (payload: Payload<any>, context: Context<any>) => Promise<any>;
};

/**
 * Stores lambda app configuration
 *
 * @property appName: The name of the app, given by the directory name
 * @property description: The description of the app, given by the description field in the app
 */
export interface LambdaApp extends Omit<AppModule, "watching"> {
    watching: Watching;
}

/**
 * Wrapper around `LambdaApp` which stores additional metadata
 *
 * @property name: The name of the app, given by the directory name
 * @property app: The `LambdaApp` object
 * @property alive: Whether the app is alive or not
 * @property logs: The logs of the app
 */
export class MetaApp {
    constructor(
        public name: string,

        public app: LambdaApp = undefined,
        public alive: boolean = false,
        public logs: string[] = []
    ) {}
}

/**
 * Handles overarching app logic such as batching triggers across multiple
 * apps watching the same observable
 */
export class AppManager {
    constructor(private apps: MetaApp[], private api: TypedApi<typeof dot>) {}

    private logLaunchStatus({ app, ...meta }: MetaApp) {
        // Log information about each app
        if (!app) {
            console.log(
                "\n" + "[" + chalk.red("x") + "]  " + chalk.bgRed(meta.name)
            );
            meta.logs.forEach((l) =>
                console.log("[" + chalk.red("Error") + "] " + l)
            );
            return;
        }

        console.log(
            "\n" +
                "[" +
                chalk.green("ok") +
                "] " +
                chalk.green(meta.name) +
                "    " +
                chalk.white.bold("watching ") +
                chalk.grey(app.watching.callPth)
        );
        console.log(chalk.grey(app.description) + "\n");
    }

    async launch() {
        const context = new Context(this.api);

        console.log(
            "\n" + chalk.yellowBright.bold("Building & launching apps")
        );
        this.apps.forEach(({ app, ...meta }) => {
            this.logLaunchStatus({ app, ...meta });
            if (meta.alive) {
                app.watching.type == WatchType.EVENT
                    ? app.watching
                          .call(
                              async (payload) =>
                                  await app.trigger(payload, context)
                          )
                          .forEach((payload) => app.lambda(payload, context))
                    : app.watching.call().forEach(async (payload) => {
                          if (await app.trigger(payload, context)) {
                              app.lambda(payload, context);
                          }
                      });
            }
        });
    }
}

/**
 * Try to load a `LambdaApp` from module given by `appName`
 *
 * @returns The `MetaApp` of a loaded or failed app
 */
function loadApp(appName: string, api: TypedApi<typeof dot>): MetaApp {
    try {
        // Pull module & create app
        const { watching, description, trigger, lambda } = require(path.join(
            appsDir,
            appName,
            "index.ts"
        )) as AppModule;
        return new MetaApp(appName, {
            description: description.trim(),
            watching: new Watching(watching, api),
            trigger: trigger,
            lambda: lambda,
        });
    } catch (e) {
        return new MetaApp(appName, undefined, false, [e.message]);
    }
}

/**
 * Load all apps from the `apps` directory into an `AppManager`
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
