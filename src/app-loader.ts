import fs from "fs";
import path from "path";
import chalk from "chalk";
import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";

const appsDir = path.join(__dirname, "./apps");

/**
 * Captures the call to the event we are watching as well as relevant metadata
 */
class Watching {
    call: Function;
    name: String;
    constructor(callPth: string, api: TypedApi<typeof dot>) {
        const pth_arr = callPth.split(".");
        let call: any = api;
        for (const pth of pth_arr) {
            call = call[pth];
        }
        this.call = call["watch"];
        this.name = callPth;
    }
}

/**
 * Stores app metadata
 */
export class LambdaApp {
    appName: String;
    description: String;
    watching: Watching;
    trigger: Function;
    lambda: Function;
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
