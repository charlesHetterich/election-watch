import { Observable, Subscription } from "rxjs";
import * as D from "@polkadot-api/descriptors";

import { Expand } from "../helpers";
import { FromVirtual, VirtualChainId } from "../known-chains";
import { FuncTree, LeafFunction, WatchLeaf } from ".";
import { AppRpc } from "@lambdas/app-handler/rpc";

export const name = "event";

/**
 * Options for a {@link WatchLeaf} leaf for an *event observable*
 */
export class LeafOptions {
    constructor(options: {} = {}) {}
}

/**
 * Utility type to extract all WatchLeaf types within a tree structure
 */
type ExtractLeaves<T extends FuncTree | LeafFunction> = T extends LeafFunction
    ? ReturnType<T>
    : T[keyof T] extends FuncTree | LeafFunction
    ? ExtractLeaves<T[keyof T]>
    : never;

export const TreeExtension = {
    /**
     * Watch all *observables* under this event tree node
     *
     * @param options - Options applied to all leaves in this tree
     */
    all<const Self extends FuncTree, O extends Expand<LeafOptions>>(
        this: Self,
        options?: O
    ): ExtractLeaves<Self> {
        const leaves: WatchLeaf[] = [];

        for (const key of Object.keys(this as Record<string, unknown>)) {
            if (key in TreeExtension) continue;

            const subTree = (this as any)[key];

            if (typeof subTree === "function") {
                leaves.push(subTree(options));
            } else {
                leaves.push(...subTree.all(options));
            }
        }
        return leaves.flat() as ExtractLeaves<Self>;
    },
};

/**
 * The structure of a payload under `Observables.event`
 */
export type PayloadStructure<Value> = Value;

/**
 * An `event` FuncTree for a blockchain given by `V`.
 */
export type Tree<V extends VirtualChainId = VirtualChainId> = FuncTree<
    (typeof D)[FromVirtual<V>]["descriptors"]["pallets"]["__event"],
    `event`,
    FromVirtual<V>,
    typeof TreeExtension
>;

export function handleLeaf(
    watchable: {
        watch: () => Observable<any>;
    },
    leaf: WatchLeaf,
    appRpc: AppRpc,
    routeId: number
): Subscription {
    return watchable.watch().subscribe((data: any) => {
        const payload = {
            ...data.payload,
            __meta: {
                chain: leaf.chain,
                path: leaf.path,
            },
        };
        appRpc.pushPayload(routeId, payload);
    });
}
