import { Subscription, Observable } from "rxjs";
import * as D from "@polkadot-api/descriptors";

import { Expand } from "../helpers";
import { FromVirtual, VirtualChainId } from "../known-chains";
import { FuncTree, WatchLeaf } from ".";
import { AppRpc, VirtualRpc } from "@lambdas/app-handler/rpc";

export const name = "storage";

/**
 * Options for `Observables.storage` leaves
 */
export class LeafOptions {
    /**
     * Specifies whether to hold off on triggering until a change to this leaf's storage
     * item is finalized— or trigger immedidately when any changes are detected on the "best" block.
     *
     * You should only want to set this to `false` if you are doing something that is time sensitive and
     * can handle changes being reverted at some point in the near future (e.g. real-time gaming or messaging).
     *
     * Defaults to `true`.
     */
    finalized?: boolean;

    /**
     * Optionally trigger only on updates/inserts, or only deletions, of the storage
     * item being watched. If not specified, all changes will trigger.
     */
    changeType?: "upsert" | "deleted";

    constructor(
        options: { finalized?: boolean; changeType?: "upsert" | "deleted" } = {}
    ) {
        this.finalized = options.finalized;
        this.changeType = options.changeType;
    }
}

/**
 * The structure of a payload under `Observables.storage`
 *
 * @property Key   - the actual full set of keys used to access this storage item
 * @property Value - the latest value of the storage item
 */
export type PayloadStructure<Key, Value> = Expand<{
    key: Key;
    value: Value;
}>;

/**
 * A `storage` FuncTree for a blockchain given by `V`.
 */
export type Tree<V extends VirtualChainId = VirtualChainId> = FuncTree<
    (typeof D)[FromVirtual<V>]["descriptors"]["pallets"]["__storage"],
    `storage`,
    FromVirtual<V>
>;

/**
 * See PAPI [Storage Queries](https://papi.how/typed/queries) for more understanding
 * of how we handle `.watchEntries` and `.watchValue`.
 */
export function handleLeaf(
    watchable: {
        watchEntries: (...args: any[]) => Observable<any>;
        watchValue: (...args: any[]) => Observable<any>;
    },
    leaf: WatchLeaf,
    nArgs: number,
    appRpc: VirtualRpc<AppRpc>,
    routeId: number
): Subscription {
    return (
        leaf.args.length < nArgs
            ? leaf.options.finalized == false
                ? watchable.watchEntries(...leaf.args, { at: "best" })
                : watchable.watchEntries(...leaf.args)
            : watchable.watchValue(
                  ...leaf.args,
                  leaf.options.finalized ? "finalized" : "best"
              )
    ).subscribe((payload: any) => {
        // Normalize payload structures from `watchEntries` and `watchValue`
        let _payload: { args: any; value: any }[];
        if (payload.entries) {
            _payload = payload.entries;
        } else {
            _payload = [{ args: leaf.args, value: payload }];
        }

        const refinedPayloads = _payload.map((p) => {
            return {
                key: p.args,
                value: p.value,
                __meta: {
                    chain: leaf.chain,
                    path: leaf.path,
                },
            };
        });
        for (const p of refinedPayloads) {
            appRpc.pushPayload(routeId, p);
        }
    });
}
