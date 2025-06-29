import { Configuration, ROOTS, WatchLeaf } from "@lambdas/app-support";
import { AppRpc, VirtualRpc } from ".";
import { AppsManager } from "../manager";
import { LambdaApp, WatchType } from "../app";
import { loadConfigurations } from "../configurations";
import { Subscription } from "rxjs";

export class HostRpc {
    constructor(
        private manager: AppsManager,
        private app: LambdaApp,
        private appRpc: VirtualRpc<AppRpc>
    ) {}

    async register(
        configurations: Configuration[],
        observables: WatchLeaf[][]
    ) {
        this.app.config = await loadConfigurations(
            this.app.name,
            configurations
        );
        this.app.chains = observables
            .flat()
            .reduce((acc: Record<string, number>, leaf: WatchLeaf) => {
                acc[leaf.chain] = (acc[leaf.chain] || 0) + 1;
                return acc;
            }, {});

        observables.forEach(async (leaves, idx) => {
            for (const leaf of leaves) {
                const path_arr = leaf.path.split(".");

                // Start at the top this chain's API/Codec, and then
                // traverse properties to the desired observable value
                let watchable: any = await this.manager.getAPI(leaf.chain);
                let codec: any = await this.manager.getCodec(leaf.chain);
                for (const pth of path_arr) {
                    watchable =
                        watchable[pth == WatchType.STORAGE ? "query" : pth];
                    codec = codec[pth == WatchType.STORAGE ? "query" : pth];
                }

                // Start subscription based on observable
                let sub: Subscription;
                switch (path_arr[0]) {
                    case WatchType.EVENT:
                        sub = ROOTS.event.handleLeaf(
                            watchable,
                            leaf,
                            this.appRpc,
                            idx
                        );
                        break;
                    case WatchType.STORAGE:
                        const nArgs: number = codec.args.inner.length;
                        sub = ROOTS.storage.handleLeaf(
                            watchable,
                            leaf,
                            nArgs,
                            this.appRpc,
                            idx
                        );
                        break;
                    default:
                        throw new Error(
                            `Invalid \`Observables\` route on chain ${leaf.chain} with path ${path_arr}. Must start with "event" or "query".`
                        );
                }

                // Keep pointer to subscription in Lambda app
                this.app.subscriptions.set(leaf, sub);
                sub.add(() => {
                    this.app.subscriptions.delete(leaf);
                });
            }
        });
        this.app.alive = true;
        console.log("not implemented!");

        // send requirements for context back
        return this.app.config.settings;
    }

    setSettings(appId: string, setting: object) {
        console.log("not implemented!");
    }
}
