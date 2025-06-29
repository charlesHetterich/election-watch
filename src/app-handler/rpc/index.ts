import { WebSocket } from "ws";
import { HostRpc } from "./host";
import { AppRpc } from "./app";

export { HostRpc, AppRpc };
export type RpcRequest = { id: number; method: string; params: any[] };
export type RpcResponse = { id: number; result?: unknown; error?: string };
export type RpcMessage = RpcRequest | RpcResponse;

/**
 * Converts some RPC object into its "remote" from.
 *
 * In reality, it just converts all functions to return a `Promise`.
 */
export type VirtualRpc<T> = {
    [K in keyof T]: T[K] extends (...args: any) => Promise<any>
        ? T[K]
        : T[K] extends (...args: infer P) => infer R
        ? (...args: P) => Promise<R>
        : never;
};

/**
 * Manages incoming & outgoing RPC communication between
 * two peers over WebSocket connection
 *
 * @template AwayRpc - The body of the remote RPC object
 * @template HomeRpc - The body of the local RPC object
 */
export class RpcPeer<
    AwayRpc extends HostRpc | AppRpc,
    HomeRpc extends HostRpc | AppRpc
> {
    /**
     * Provides Id's used to match submitted requests with incoming responses
     */
    private nextRequestId = 1;

    /**
     * Map of request Id's to associated "promise resolving" function
     */
    private pendingResponse = new Map<number, (msg: RpcResponse) => void>();

    /**
     * RPC object used to send outbound requests
     */
    public awayRpc: VirtualRpc<AwayRpc>;

    /**
     * RPC object used to handle incoming requests
     */
    public homeRpc?: HomeRpc;

    constructor(private socket: WebSocket, awayRpcPrototype: AwayRpc) {
        // Create home & away RPC objects
        this.awayRpc = this.awayRpcBuilder(awayRpcPrototype);

        // Route all incoming requests & responses
        this.socket.onmessage = (ev) => {
            const msg: RpcMessage = JSON.parse(ev.data.toString());
            if ("method" in msg) this.onRequest(msg);
            else this.pendingResponse.get(msg.id)?.(msg);
        };
    }

    /**
     * Builds the RPC object which sends requests to the remote side
     * given a prototype of the `AwayRpc` class.
     */
    private awayRpcBuilder(prototype: AwayRpc) {
        const props = Object.getOwnPropertyNames(prototype)
            .filter((name) => name !== "constructor")
            .map((method) => {
                return [
                    method,
                    (params: any[]) => this.callRemote(method, params),
                ] as const;
            });
        return Object.fromEntries(props) as VirtualRpc<AwayRpc>;
    }

    /**
     * Call a function on the remote side
     *
     * @param method - The method to call on the remote side
     * @param params - The parameters to pass to the method
     */
    private callRemote(method: string, params: any[]): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const id = this.nextRequestId++;
            this.pendingResponse.set(id, (reply) => {
                this.pendingResponse.delete(id);
                "error" in reply ? reject(reply.error) : resolve(reply.result);
            });
            this.send({ id, method, params });
        });
    }

    /**
     * Handle incoming request & send response
     */
    public async onRequest(msg: RpcRequest) {
        try {
            if (!this.homeRpc) {
                throw new Error("Home RPC is not ready");
            }

            let result: unknown;
            result = await (this.homeRpc as any)[msg.method](...msg.params);
            this.send({ id: msg.id, result });
        } catch (e: any) {
            this.send({ id: msg.id, result: undefined, error: String(e) });
        }
    }

    /**
     * Serialize & send outbound message
     */
    send(msg: RpcMessage) {
        this.socket.send(JSON.stringify(msg));
    }
}
