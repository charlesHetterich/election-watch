import chalk from "chalk";
import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";

import { Context } from "@lambdas/app-support";
import { LambdaApp } from "./app";

/**
 * Handles overarching app logic & management
 *
 * @property apps - The list of apps to manage
 * @property api  - The API to use for the apps
 */
export class AppManager {
    constructor(private apps: LambdaApp[], private api: TypedApi<typeof dot>) {}

    /**
     * Logs the health & details of a loaded app.
     */
    private logLaunchStatus(app: LambdaApp) {
        if (!app.alive) {
            console.log(
                "\n" + "[" + chalk.red("x") + "]  " + chalk.bgRed(app.name)
            );
            app.logs.forEach((l) =>
                console.log("[" + chalk.red("Error") + "] " + l)
            );
            return;
        }
        console.log(
            "\n" +
                "[" +
                chalk.green("ok") +
                "] " +
                chalk.green(app.name) +
                "    " +
                chalk.white.bold("watching ") +
                chalk.grey(app.watchPaths)
        );
        console.log(chalk.grey(app.description) + "\n");
    }

    async launch() {
        const context = new Context(this.api);
        console.log(
            "\n" + chalk.yellowBright.bold("Building & launching apps")
        );

        // Launch all apps
        this.apps.forEach((app) => {
            this.logLaunchStatus(app);
            if (app.alive) {
                app.handlers.forEach((handler) => {
                    handler(context);
                });
            }
        });
    }
}
