import { PlainDescriptor, StorageDescriptor } from "polkadot-api";
import { ChainId } from "./known-chains";

/**
 * Utility type to expand a type into its properties.
 *
 * Used for fine-tuned control over what exactly displays when hovering over variables in IDE.
 */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/**
 * Converts a type string into a tuple of type strings
 */
export type Split<
    S extends string,
    Delimiter extends string = "."
> = S extends `${infer Head}${Delimiter}${infer Tail}`
    ? [Head, ...Split<Tail, Delimiter>]
    : [S];

/**
 *  Union of `[] | [key1] | [key1, key2] | ...` across some set of keys
 */
export type PartialArgs<T extends readonly any[]> = T extends [
    ...infer Rest,
    any
]
    ? PartialArgs<Rest> | T
    : T;

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
export type PayloadLookup<TreeNode, Path extends readonly string[]> =
    // Pop top key from path
    Path extends [infer K, ...infer Rest extends string[]]
        ? // More path— dig deeper
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

/**
 * Tests covered by sibling files
 */
