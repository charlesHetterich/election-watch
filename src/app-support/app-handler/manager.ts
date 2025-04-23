import chalk from "chalk";
import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";
import { Context } from "../context";

import { WatchType, MetaApp } from "./app";

/**
 * Handles overarching app logic such as batching triggers across multiple apps watching the same observable
 *
 * @property apps - The list of apps to manage
 * @property api  - The API to use for the apps
 */
export class AppManager {
    constructor(private apps: MetaApp[], private api: TypedApi<typeof dot>) {}

    private logLaunchStatus({ app, ...meta }: MetaApp) {
        if (!meta.alive) {
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
