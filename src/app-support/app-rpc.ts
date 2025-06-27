// child-bootstrap.ts  (runs inside Deno)
import { WebSocket } from "ws";
import { RpcPeer } from "./rpc";
import { AppModule } from "./types";
import { HostRpc } from "@lambdas/app-handler/rpc";

const HOST_PORT = 7001;
const appName = "get this from launch args";

export const AppRpc = {
    async setSettings(setting: object) {
        console.log("not implemented!");
    },

    async processPayload(routeIndex: number, rawPayload: any) {
        console.log("not implemented!");
    },
};
const ws = new WebSocket(`ws://127.0.0.1:${HOST_PORT}`);
await new Promise((r) => (ws.onopen = r));
const rpc = new RpcPeer(ws, AppRpc, HostRpc);

function register(app: AppModule) {
    rpc.otherRpc.register(
        appName,
        app.config,
        app.routes.map((r) => r.watching)
    );
}
