import { dot } from "@polkadot-api/descriptors";
import { ChainDefinition, createClient, TypedApi } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot"; // Can select other chains (kusama, westend, etc. here)
import { start } from "polkadot-api/smoldot";
import chalk from "chalk";

import { loadApps } from "./app-loader";
import { SUBSTRATE_LAMBDAS } from "./titles";

console.log(SUBSTRATE_LAMBDAS);

export class Context<T extends ChainDefinition> {
    constructor(public api: TypedApi<T>) {}
}

async function main() {
    // Setup PAPI
    const smoldot = start();
    const chain = await smoldot.addChain({ chainSpec });
    const client = createClient(getSmProvider(chain));
    const papi = client.getTypedApi(dot);

    const context = new Context(papi);
    function callWithContext(call: Function) {
        return async (args: any) => {
            const result = await call(args, context);
            return result;
        };
    }

    // Load apps
    const apps = loadApps(papi);
    console.log("\n" + chalk.red("Apps Running:"));
    apps.forEach((app) => {
        // Log information about each app
        console.log(
            "\n" +
                chalk.green(app.appName) +
                "    " +
                chalk.white.bold("watching ") +
                chalk.grey(app.watching.name)
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
