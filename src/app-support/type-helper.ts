import { dot } from "@polkadot-api/descriptors";
import { ChainDefinition, PlainDescriptor, TypedApi } from "polkadot-api";

/**
 * Builds tree of descriptor types
 */
type DescriptorTree<T> = {
    [K in keyof T]: T[K] extends PlainDescriptor<infer U>
        ? U
        : DescriptorTree<T[K]>;
};

/**
 * Converts a type string into a tuple of type strings
 */
type Split<
    S extends string,
    Delimiter extends string = "."
> = S extends `${infer Head}${Delimiter}${infer Tail}`
    ? [Head, ...Split<Tail, Delimiter>]
    : [S];

/**
 * Extract specific type inside of a descriptor tree, given by a list of type strings
 */
type DeepLookup<
    T,
    Path extends readonly string[] | string
> = Path extends string
    ? DeepLookup<T, Split<Path>>
    : Path extends [infer K, ...infer Rest]
    ? K extends keyof T
        ? Rest extends string[]
            ? DeepLookup<T[K], Rest>
            : T[K]
        : never
    : T;

/**
 * Type alias for `DeepLookup` exposed for apps
 */
export type Payload<T, Path extends readonly string[] | string> = DeepLookup<
    T,
    Path
>;

/**
 * Descriptor tree for PAPI events
 */
export type Events = {
    event: DescriptorTree<typeof dot.descriptors.pallets.__event>;
};
