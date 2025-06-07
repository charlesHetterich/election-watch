import * as D from "@polkadot-api/descriptors";
import { PlainDescriptor, StorageDescriptor } from "polkadot-api";

import { Split } from "./helpers";
import { WatchLeaf } from "./observables";
import { ROOTS } from "../types/observables";
import { Context } from "../context";
import { TRoute } from "./apps";

/**
 * Extract specific type inside of a descriptor tree, given by a list of type strings
 */
export type PayloadLookup<
    TreeNode,
    Path extends readonly string[]
> = Path extends [infer K, ...infer Rest extends string[]]
    ? // Pop top key from path More path— dig deeper
      K extends keyof TreeNode
        ? PayloadLookup<TreeNode[K], Rest>
        : never
    : // Storage leaf
    TreeNode extends StorageDescriptor<infer Key, infer Value, any, any>
    ? ROOTS.storage.PayloadStructure<Key, Value>
    : // Event leaf
    TreeNode extends PlainDescriptor<infer Value>
    ? ROOTS.event.PayloadStructure<Value>
    : never;

/**
 * The expected type of a payload for a given `WatchLeaf`
 */
export type Payload<WL extends WatchLeaf> = PayloadLookup<
    {
        event: (typeof D)[WL["chain"]]["descriptors"]["pallets"]["__event"];

        storage: (typeof D)[WL["chain"]]["descriptors"]["pallets"]["__storage"];
    },
    Split<WL["path"]>
>;

/**
 * Intersection of all possible payload types for a given array of `WatchLeaf`s.
 *
 * Use {@link narrowPayload} to narrow the payload type
 */
export type PossiblePayload<WLs extends readonly WatchLeaf[]> = WLs extends [
    infer W extends WatchLeaf
]
    ? Payload<W>
    : WLs extends readonly [
          infer First extends WatchLeaf,
          ...infer Rest extends readonly WatchLeaf[]
      ]
    ? Payload<First> | PossiblePayload<Rest>
    : any;

/**
 * Reveals hidden properties on a payload
 *
 * Intended for internal use only
 */
type PayloadExtension = {
    __meta: {
        chain: WatchLeaf["chain"];
        path: WatchLeaf["path"];
    };
};
/**
 * Alias for {@link PayloadExtension} exposed for experimental use
 */
export type _PayloadExtension = PayloadExtension;

/**
 * Conditionally make a payload's type narrowed, when working
 * with payloads from more than one `WatchLeaf`
 */
export function narrowPayload<T extends WatchLeaf>(
    payload: Payload<any>,
    watchLeaf: T
): payload is Payload<T> {
    const _payload = payload as PayloadExtension;
    return (
        _payload.__meta.chain === watchLeaf.chain &&
        _payload.__meta.path === watchLeaf.path
    );
}

export async function processPayload<T extends WatchLeaf[]>(
    payload: PossiblePayload<T>,
    context: Context,
    trigger: TRoute<T>["trigger"],
    lambda: TRoute<T>["lambda"]
) {
    if (await trigger(payload, context)) {
        lambda(payload, context);
    }
}

if (import.meta.vitest) {
    const { test, expect, describe } = import.meta.vitest;
    test("TODO! Implement tests", () => {
        expect("").toEqual("todo!");
    });
}
