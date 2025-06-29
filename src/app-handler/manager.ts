import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import chalk from "chalk";
import { Chain, Client, start } from "polkadot-api/smoldot";
import { getSmProvider } from "polkadot-api/sm-provider";
import { createClient, getTypedCodecs, TypedApi } from "polkadot-api";
import * as D from "@polkadot-api/descriptors";
import * as chains from "polkadot-api/chains";

import { ChainId, RelayId, getRelayId, isRelay } from "@lambdas/app-support";
import { LambdaApp } from "./app";
import { WebSocketServer } from "ws";
import { RpcPeer, HostRpc, AppRpc, VirtualRpc } from "./rpc";
import DB from "./database";

/**
 * Handles overarching app logic & management
 *
 * @property rpc         - Map app session token to RPC connection
 * @property lightClient - A smoldot light client
 * @property relayChains - Relay chains supporting apps for this manager
 * @property apis        - The collection of `TypedAPI`s being used across all apps
 * @property apps        - The list of apps to manage
 */
export class AppsManager {
    private appRpcs = {} as Record<string, VirtualRpc<AppRpc>>;
    private lightClient: Client;
    private relayChains = {} as Record<RelayId, Chain>;
    private codecs = {} as Record<ChainId, any>;
    public apis = {} as Record<ChainId, TypedApi<(typeof D)[ChainId]>>;
    public apps = {} as Record<string, LambdaApp>;

    constructor(private rpcPort = 7001) {
        this.lightClient = start();
        const wss = new WebSocketServer({ port: this.rpcPort });
        wss.on("connection", (ws, req) => {
            const token = new URL(req.url!, "ws://host").searchParams.get(
                "token"
            );

            // Ignore unrecognized connections
            let app: LambdaApp;
            if (token && token in this.apps) {
                app = this.apps[token];
            } else {
                ws.close(1008, "Invalid token");
                return;
            }

            // Establish Host <--> App RPC
            const peer = new RpcPeer(ws, AppRpc.prototype);
            this.appRpcs[token] = peer.awayRpc;
            peer.homeRpc = new HostRpc(this, app, peer.awayRpc);
        });
    }

    /**
     *
     */
    public async shutdown() {
        Object.values(this.apps).forEach((app) => app.shutdown());
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

        // Create Host <--> `newChain` RPC client, grab & return its typed API
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
            // app.logs.forEach((l) =>
            //     console.log("[" + chalk.red("Error") + "] " + l)
            // );
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
        console.log(app.config.settings);
        console.log("\n" + chalk.grey(app.config.description) + "\n\n");
    }

    /**
     * Start all apps from the `appsDir` directory
     */
    startApps(appsDir: string) {
        // Find all apps in `appsDir`
        let appNames: string[];
        if (fs.existsSync(appsDir)) {
            appNames = fs
                .readdirSync(appsDir, { withFileTypes: true })
                .filter((dir) => dir.isDirectory() && !dir.name.startsWith("_"))
                .map((dirent) => dirent.name);
        } else {
            throw new Error(`Apps directory ${appsDir} not found.`);
        }

        // Start each app inside its own Deno container
        for (const appName of appNames) {
            const token = appName;
            this.apps[token] = new LambdaApp(appName);

            // Launch app
            const p = spawn(
                "deno",
                [
                    "run",
                    "--quiet",
                    `--allow-net=127.0.0.1:${this.rpcPort}`,
                    "--no-prompt",
                    path.join(appsDir, appName, "index.ts"),
                ],
                {
                    stdio: ["ignore", "pipe", "pipe"],
                    env: {
                        ...process.env,
                        HOST_PORT: `${this.rpcPort}`,
                        SESSION_TOKEN: token,
                    },
                }
            );

            // Pipe app logs to database
            const wireStream = (s: NodeJS.ReadableStream, isErr: boolean) => {
                const flush = (text: string) => {
                    DB.logs.push(appName, text);

                    // mirror to console, but **don’t touch** the app’s colours
                    const tag = chalk.cyan(`[${appName}]`);
                    console.log(
                        isErr ? chalk.red(tag) + " " + text : tag + " " + text
                    );
                };
                s.on("data", flush);
            };
            wireStream(p.stdout!, false);
            wireStream(p.stderr!, true);
        }
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
