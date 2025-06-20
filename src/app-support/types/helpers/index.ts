export * from "./field-names";

export type TypeErrorMessage<S extends string> = {
    msg: S;
};

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
 *  Union of `[] | [arg1] | [arg1, arg2] | ...` across some `Args`
 */
export type PartialArgs<Args extends readonly any[]> = Args extends [
    ...infer Rest,
    any
]
    ? PartialArgs<Rest> | Args
    : Args;

/**
 * Recursively flattens a tuple type into a single-level array type.
 */
export type Flat<T extends readonly any[]> = T extends readonly [
    infer First,
    ...infer Rest
]
    ? First extends readonly any[]
        ? [...Flat<First>, ...Flat<Rest>]
        : [First, ...Flat<Rest>]
    : [];

/**
 * Utility type for {@link UnionToTuple}
 */
export type UnionToIntersection<U> = (
    U extends any ? (k: U) => void : never
) extends (k: infer I) => void
    ? I
    : never;

/**
 * Utility type for {@link UnionToTuple}
 */
type LastOf<U> = UnionToIntersection<
    U extends any ? (x: U) => 0 : never
> extends (x: infer L) => 0
    ? L
    : never;

/**
 * TODO! We would like to use this to get a known order of
 * `WatchLeaf`s, but this current method runs into the error
 *
 * ```ts
 * "Type instantiation is excessively deep and possibly infinite"
 * ```
 *
 * on Chains/Pallets with more than 50 properties
 * (TS type-system's recursion limit).
 */
export type UnionToTuple<U, Last = LastOf<U>> = [U] extends [never]
    ? []
    : [...UnionToTuple<Exclude<U, Last>>, Last];

/**
 * Tests covered by sibling files
 */
