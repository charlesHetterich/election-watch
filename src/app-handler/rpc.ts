import { WebSocketServer } from "ws";
import { RpcPeer } from "@lambdas/app-support/rpc";
import { Configuration, WatchLeaf } from "@lambdas/app-support";
import { AppRpc } from "@lambdas/app-support/app-rpc";

export const HostRpc = {
    async register(
        appName: string,
        configurations: Configuration[],
        observables: WatchLeaf[][]
    ) {
        // 1 listen to all rights
        // 2 mark app as "live"
        console.log("not implemented!");
    },

    async setSettings(setting: object) {
        console.log("not implemented!");
    },
};

export function startHostRpc(port = 7001) {
    const wss = new WebSocketServer({ port });

    // Triggers each time a new app connects
    wss.on("connection", (ws) => {
        const peer = new RpcPeer(ws, HostRpc, AppRpc);
        peer.otherRpc.processPayload(10, "");
    });
}
