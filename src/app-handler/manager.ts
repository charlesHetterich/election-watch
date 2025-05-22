import chalk from "chalk";
import { start } from "polkadot-api/smoldot";
import { createClient, TypedApi } from "polkadot-api";
import * as D from "@polkadot-api/descriptors";
import * as chains from "polkadot-api/chains";

import {
    ChainId,
    Context,
    ContextualAPIs,
    toVirtual,
    VirtualChainId,
} from "@lambdas/app-support";
import { LambdaApp } from "./app";
import { Chain, Client } from "polkadot-api/smoldot";
import { getSmProvider } from "polkadot-api/sm-provider";

import { getRelayId, isRelay } from "./known-chains";

/**
 * Handles overarching app logic & management
 *
 * @property lightClient - A smoldot light client
 * @property relayChains - Relay chains supporting apps for this manager
 * @property apis        - The collection of `TypedAPI`s being used across all apps
 * @property apps        - The list of apps to manage
 */
export class AppsManager {
    private lightClient: Client;
    private relayChains: Record<string, Chain> = {};
    public apis = {} as Record<ChainId, TypedApi<(typeof D)[ChainId]>>;
    public apps: LambdaApp[] = [];

    constructor() {
        this.lightClient = start();
    }

    /**
     * Get the `TypedAPI` for a given `chainId`. Add this chain,
     * RPC client, & API to the manager if it doesn't exist yet.
     */
    public async getAPI(chainId: ChainId): Promise<TypedApi<any>> {
        // Return already created API if it exists.
        // Otherwise create the chain & give its API.
        if (this.apis[chainId]) {
            return this.apis[chainId];
        }

        // Ensure the chainId is valid
        const descriptor = D[chainId];
        if (!descriptor) {
            throw new Error(
                `No descriptor found for chainId: ${chainId}. Please add it using the \`npx papi add\` command.`
            );
        }

        // Ensure corresponding relay chain exists
        const relayId = getRelayId(chainId);
        if (!this.relayChains[relayId]) {
            this.relayChains[relayId] = await this.lightClient.addChain({
                chainSpec: chains[relayId],
            });
        }

        // If we're adding a relay chain—  use the chain we just created.
        // Otherwise, this is a parachain— create its chain now
        let newChain = this.relayChains[relayId];
        if (!isRelay(chainId)) {
            newChain = await this.lightClient.addChain({
                chainSpec: chains[chainId],
                potentialRelayChains: Object.values(this.relayChains),
            });
        }

        // Create RPC client for this chain, grab its typed API, & return it
        const newClient = createClient(getSmProvider(newChain));
        this.apis[chainId] = newClient.getTypedApi(descriptor);
        return this.apis[chainId];
    }

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
        console.log(
            "\n" + chalk.yellowBright.bold("Building & launching apps")
        );

        // Launch all apps
        this.apps.forEach((app) => {
            this.logLaunchStatus(app);
            if (app.alive) {
                const dd = app.chains.reduce((acc, chainId) => {
                    acc[toVirtual(chainId)] = this.apis[chainId];
                    return acc;
                }, {} as Record<VirtualChainId, TypedApi<any>>);

                const context = new Context(
                    Object.fromEntries(
                        app.chains.map(
                            (cid) => [toVirtual(cid), this.apis[cid]] as const
                        )
                    ) as ContextualAPIs<(typeof app.chains)[number]>
                );
                app.handlers.forEach((handler) => {
                    handler(context);
                });
            }
        });
    }
}
