import { dot } from "@polkadot-api/descriptors";
import { PlainDescriptor } from "polkadot-api";
import { Context } from "./context";

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
export type Payload<Path extends readonly string[] | string> = DeepLookup<
    {
        event: DescriptorTree<typeof dot.descriptors.pallets.__event>;
        query: DescriptorTree<typeof dot.descriptors.pallets.__storage>;
    },
    Path
>;

export interface TRoute<WP extends string> {
    watching: WP;
    trigger: (
        payload: Payload<WP>,
        context: Context<typeof dot>
    ) => boolean | Promise<boolean>;
    lambda: (
        payload: Payload<WP>,
        context: Context<typeof dot>
    ) => void | Promise<void>;
}

export interface TAppModule<WPs extends string[]> {
    description: string;
    routes: { [K in keyof WPs]: TRoute<WPs[K]> };
}

export function App<WPs extends string[]>(
    description: string,
    ...routes: { [K in keyof WPs]: TRoute<WPs[K]> }
): TAppModule<WPs> {
    return {
        description,
        routes: routes,
    };
}

type PathMap<T, P extends string = ""> = {
    [K in keyof T]: T[K] extends PlainDescriptor<any>
        ? P extends "" // leaf
            ? K & string
            : `${P}.${K & string}`
        : PathMap<T[K], P extends "" ? K & string : `${P}.${K & string}`>; // subtree
};

async function buildPaths<T, P extends string>(
    prefix: P,
    tree: T
): Promise<PathMap<T, P> | Promise<string>> {
    const out = {} as any;
    let isLeaf = true;
    for (const key of Object.keys(tree) as Array<keyof T>) {
        const node = (tree as any)[key];
        const q = prefix ? `${prefix}.${key as string}` : (key as string);

        if (node && typeof node === "object" && "_type" in node) {
            out[key] = await q;
        } else {
            out[key] = await buildPaths(q as any, node);
            isLeaf = false;
        }
    }
    if (isLeaf) {
        return prefix as string;
    }
    return out;
}

export const Observables = {
    event: await buildPaths("event", (await dot.descriptors).events),
    query: await buildPaths("query", (await dot.descriptors).storage),
} as {
    event: PathMap<typeof dot.descriptors.pallets.__event, "event">;
    query: PathMap<typeof dot.descriptors.pallets.__storage, "query">;
};
