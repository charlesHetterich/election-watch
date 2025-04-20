import { dot } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot";
import { start } from "polkadot-api/smoldot";
import chalk from "chalk";

import { loadApps } from "./app-loader";
import { SUBSTRATE_LAMBDAS } from "./titles";

console.log(SUBSTRATE_LAMBDAS);

async function main() {
    // Setup PAPI
    const smoldot = start();
    const chain = await smoldot.addChain({ chainSpec });
    const client = createClient(getSmProvider(chain));
    const papi = client.getTypedApi(dot);

    // Load apps
    const apps = loadApps(papi);
    console.log("\n" + chalk.red("Apps Running:"));
    apps.forEach((app) => {
        // Log information about each app
        console.log(
            "\n" +
                chalk.green(app.appName) +
                "\t" +
                chalk.white.bold("watching ") +
                chalk.grey(app.watching.name)
        );
        console.log(chalk.grey(app.description) + "\n");

        // Launch app listener
        app.watching.call(app.trigger).forEach(app.lambda);
    });
}

main()
    .then(() => {
        console.log("Listening for events...");
    })
    .catch((error) => {
        console.error("Error:", error);
    });
