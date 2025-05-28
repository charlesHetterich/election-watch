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
 * Tests covered by sibling files
 */
