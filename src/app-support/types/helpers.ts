import { PlainDescriptor } from "polkadot-api";

/**
 * Builds tree of descriptor types
 */
export type DescriptorTree<T> = {
    [K in keyof T]: T[K] extends PlainDescriptor<infer U>
        ? U
        : DescriptorTree<T[K]>;
};

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
 * Extract specific type inside of a descriptor tree, given by a list of type strings
 */
export type DeepLookup<
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
 * Map of all paths in a descriptor tree
 */
export type PathMap<T, P extends string = ""> = {
    [K in keyof T]: T[K] extends PlainDescriptor<any>
        ? P extends "" // leaf
            ? K & string
            : `${P}.${K & string}`
        : PathMap<T[K], P extends "" ? K & string : `${P}.${K & string}`>; // subtree
};
