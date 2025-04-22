import { dot } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot"; // Can select other chains (kusama, westend, etc. here)
import { start } from "polkadot-api/smoldot";
import chalk from "chalk";

import { loadApps, Context } from "./app-support";
import { SUBSTRATE_LAMBDAS } from "./titles";
import { skip } from "node:test";

console.log(SUBSTRATE_LAMBDAS);

async function main() {
    // Setup PAPI
    const smoldot = start();
    const chain = await smoldot.addChain({ chainSpec });
    const client = createClient(getSmProvider(chain));
    const papi = client.getTypedApi(dot);

    // Provide context to app calls
    const context = new Context(papi);
    function callWithContext(call: Function) {
        return async (args: any) => {
            const result = await call(args, context);
            return result;
        };
    }

    // Load apps | TODO! batch triggers listening to the same observable
    const wrappedApps = loadApps(papi);
    console.log("\n" + chalk.red("Apps Running:"));
    wrappedApps.forEach(({ name, app, logs }) => {
        if (!app) {
            // Log information about each app
            console.log(
                "\n" + "[" + chalk.red("x") + "]  " + chalk.bgRed(name)
            );
            logs.forEach((l) =>
                console.log("[" + chalk.red("Error") + "] " + l)
            );
            return;
        }

        // Log information about each app
        console.log(
            "\n" +
                "[" +
                chalk.green("ok") +
                "] " +
                chalk.green(app.appName) +
                "    " +
                chalk.white.bold("watching ") +
                chalk.grey(app.watching.callPth)
        );
        console.log(chalk.grey(app.description) + "\n");

        // Launch app listener
        app.watching
            .call(callWithContext(app.trigger))
            .forEach(callWithContext(app.lambda));
    });
}

main().catch((error) => {
    console.error("Error:", error);
});
