import * as D from "@polkadot-api/descriptors";
import { PlainDescriptor, StorageDescriptor } from "polkadot-api";

import { Expand, Split } from "./helpers";
import { WatchLeaf } from "./observables";

/**
 * The structure of a payload under `Observables.event`
 */
type EventPayload<Value> = Value;

/**
 * The structure of a payload under `Observables.storage`
 */
type StoragePayload<Key, Value> = Expand<{
    key: Key;
    value: Value;
}>;

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
    ? StoragePayload<Key, Value>
    : // Event leaf
    TreeNode extends PlainDescriptor<infer Value>
    ? EventPayload<Value>
    : never;

export type Payload<WL extends WatchLeaf> = PayloadLookup<
    {
        event: (typeof D)[WL["chain"]]["descriptors"]["pallets"]["__event"];

        storage: (typeof D)[WL["chain"]]["descriptors"]["pallets"]["__storage"];
    },
    Split<WL["path"]>
>;
