import { WebSocket } from "ws";

export type RpcRequest = { id: number; method: string; params: any[] };
export type RpcResponse = { id: number; result?: unknown; error?: string };
export type RpcMessage = RpcRequest | RpcResponse;

/**
 * Create the object to interact with RPC of the other side.
 */
export function RpcOther<T extends object>(socket: WebSocket, rpcBody: T): T {
    let next = 1;
    const pending = new Map<number, (msg: RpcMessage) => void>();
    const rpcEntries = Object.keys(rpcBody).map((key) => {
        return [
            key,
            function (method: string, params: unknown): Promise<T> {
                return new Promise<T>((resolve, reject) => {
                    const id = next++;
                    pending.set(id, (reply) => {
                        pending.delete(id);
                        "error" in reply
                            ? reject(reply.error)
                            : resolve((reply as any).result as T);
                    });
                    socket.send(JSON.stringify({ id, method, params }));
                });
            },
        ] as const;
    });
    return Object.fromEntries(rpcEntries) as T;
}

export class RpcPeer<T extends object> {
    private next = 1;
    private pending = new Map<number, (msg: RpcMessage) => void>();
    public otherRpc: T;

    constructor(private socket: WebSocket, rpcBody: any, awayRpcBody: T) {
        // Process all incoming traffic (requests & responses)
        socket.onmessage = (ev) => {
            const msg: RpcMessage = JSON.parse(ev.data.toString());
            if ("method" in msg) this.onRequest(msg);
            else this.pending.get(msg.id)?.(msg);
        };

        // Define request handler given `rpcBody`
        this.onRequest = async ({ id, method, params }) => {
            try {
                let result: unknown;
                result = rpcBody[method](...params);
                this.respond(id, result);
            } catch (e: any) {
                this.respond(id, undefined, String(e));
            }
        };

        const rpcEntries = Object.keys(rpcBody).map((key) => {
            return [
                key,
                (method: string, params: unknown): Promise<T> => {
                    return new Promise<T>((resolve, reject) => {
                        const id = this.next++;
                        this.pending.set(id, (reply) => {
                            this.pending.delete(id);
                            "error" in reply
                                ? reject(reply.error)
                                : resolve((reply as any).result as T);
                        });
                        socket.send(JSON.stringify({ id, method, params }));
                    });
                },
            ] as const;
        });

        this.otherRpc = Object.fromEntries(rpcEntries) as T;
    }

    /** install your request handler */
    public onRequest: (msg: RpcRequest) => void;

    /** reply helper  */
    respond(id: number, result?: unknown, error?: string) {
        this.socket.send(JSON.stringify({ id, result, error }));
    }
}
