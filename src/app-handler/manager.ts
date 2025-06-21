import chalk from "chalk";
import { Chain, Client, start } from "polkadot-api/smoldot";
import { getSmProvider } from "polkadot-api/sm-provider";
import { createClient, getTypedCodecs, TypedApi } from "polkadot-api";
import * as D from "@polkadot-api/descriptors";
import * as chains from "polkadot-api/chains";

import {
    ChainId,
    Context,
    ContextualAPIs,
    RelayId,
    toVirtual,
    getRelayId,
    isRelay,
} from "@lambdas/app-support";
import { LambdaApp } from "./app";

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
    private relayChains = {} as Record<RelayId, Chain>;
    private codecs = {} as Record<ChainId, any>;
    public apis = {} as Record<ChainId, TypedApi<(typeof D)[ChainId]>>;
    public apps: LambdaApp[] = [];

    constructor() {
        this.lightClient = start();
    }

    /**
     *
     */
    public async shutdown() {
        this.apps.forEach((app) => app.shutdown());
        await this.lightClient.terminate();
    }

    /**
     *
     */
    public async getCodec(chainId: ChainId) {
        if (!this.codecs[chainId]) {
            this.codecs[chainId] = await getTypedCodecs(D[chainId]);
        }
        return this.codecs[chainId];
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
                chalk.white.bold(" watching")
        );
        console.log(
            Object.entries(app.chains)
                .map(([chainId, n]) => {
                    return (
                        "  " +
                        chalk.yellow(`${n} `) +
                        chalk.grey("entries on ") +
                        `${chainId}`
                    );
                })
                .join("\n")
        );
        console.log("\n" + chalk.grey(app.config.description) + "\n\n");
    }

    launch() {
        console.log(
            "\n" + chalk.yellowBright.bold("Building & launching apps")
        );

        // Launch all apps
        this.apps.forEach((app) => {
            this.logLaunchStatus(app);
            if (app.alive) {
                const context = new Context(
                    Object.fromEntries(
                        (Object.keys(app.chains) as ChainId[]).map(
                            (cid) => [toVirtual(cid), this.apis[cid]] as const
                        )
                    ) as ContextualAPIs<ChainId>,
                    app.config.settings
                );
                app.launch(context);
            }
        });
    }
}

if (import.meta.vitest) {
    const { test, expect } = import.meta.vitest;
    const appsDir = "tests/mock-apps";

    /**
     * TODO! test that payloads properly get `__meta`
     *       attached to them when entering `lambda` & `trigger`
     */
    test.todo("");
}
