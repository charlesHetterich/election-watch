import * as D from "@polkadot-api/descriptors";
import { Expand, PartialArgs } from "./helpers";
import {
    knownChains,
    toVirtual,
    FromVirtual,
    VirtualChainId,
    ChainId,
} from "./known-chains";
import { PlainDescriptor, StorageDescriptor } from "polkadot-api";

/**
 *
 */
export type WatchLeaf<
    C extends ChainId = ChainId,
    P extends string = string,
    A extends any[] = any[],
    O extends object = object
> = Expand<{ chain: C; path: P; args: A; options: O }>;

/**
 *
 */
export type FuncTree<T, P extends string, C extends ChainId> = {
    [K in keyof T]: T[K] extends StorageDescriptor<infer Keys, any, any, any>
        ? (
              ...args: PartialArgs<Keys>
          ) => [WatchLeaf<C, `${P}.${K & string}`, PartialArgs<Keys>, {}>]
        : T[K] extends PlainDescriptor<any>
        ? () => [WatchLeaf<C, `${P}.${K & string}`, [], {}>]
        : FuncTree<T[K], P extends "" ? K & string : `${P}.${K & string}`, C>;
};

// async function buildPaths<
//     C extends ChainId,
//     P extends string,
//     T extends object
// >(chain: C, prefix: P, tree: T): Promise<FuncTree<T, P, C> | Promise<WatchLeaf>> {
//     const out = {} as any;
//     let isLeaf = true;
//     for (const key of Object.keys(tree) as Array<keyof T>) {
//         const node = (tree as any)[key];
//         const q = prefix ? `${prefix}.${key as string}` : (key as string);

//         if (node && typeof node === "object" && "_type" in node) {
//             out[key] = await q;
//         } else {
//             out[key] = await buildPaths(q as any, node);
//             isLeaf = false;
//         }
//     }
//     if (isLeaf) {
//         return prefix as string;
//     }
//     return out;
// }

function buildFuncPaths<
    T extends object,
    C extends ChainId,
    P extends string = ""
>(prefix: P, tree: T, chain: C): FuncTree<T, P, C> {
    const out: any = {};
    for (const key of Object.keys(tree) as Array<keyof T>) {
        const node = (tree as any)[key];
        const nextPrefix = prefix
            ? `${prefix}.${key as string}`
            : (key as string);

        //   plain descriptor  ────────── event
        if (
            node &&
            typeof node === "object" &&
            "_type" in node &&
            !("_args" in node)
        ) {
            out[key] = () => ({ chain, path: nextPrefix });
            continue;
        }

        //   storage descriptor ───────── query w/ args
        if (node && typeof node === "object" && "_args" in node) {
            out[key] = (...args: any[]) => ({ chain, path: nextPrefix, args });
            continue;
        }

        //   deeper pallet subtree
        out[key] = buildFuncPaths(nextPrefix, node, chain);
    }
    return out;
}

type ObservablesEventMap<V extends VirtualChainId> = FuncTree<
    (typeof D)[FromVirtual<V>]["descriptors"]["pallets"]["__event"],
    `event`,
    FromVirtual<V>
>;

type ObservablesQueryMap<V extends VirtualChainId> = FuncTree<
    (typeof D)[FromVirtual<V>]["descriptors"]["pallets"]["__storage"],
    `storage`,
    FromVirtual<V>
>;

type ObservablesMap = {
    event: { [V in VirtualChainId]: ObservablesEventMap<V> };
    storage: { [V in VirtualChainId]: ObservablesQueryMap<V> };
};

export const Observables: Readonly<ObservablesMap> = await (async () => {
    // Build event tree
    const eventEntries = await Promise.all(
        knownChains.map(async (id) => {
            const vId = toVirtual(id);
            const d = await D[id].descriptors;
            const pm = (await buildFuncPaths(
                `event`,
                d.events,
                id
            )) as ObservablesEventMap<typeof vId>;

            return [vId, pm] as const;
        })
    );
    const eventObj = Object.fromEntries(eventEntries) as {
        [V in VirtualChainId]: ObservablesEventMap<V>;
    };

    // Build query tree
    const queryEntries = await Promise.all(
        knownChains.map(async (id) => {
            const vId = toVirtual(id);
            const d = await D[id].descriptors;
            const pm = (await buildFuncPaths(
                `storage`,
                d.storage,
                id
            )) as ObservablesQueryMap<typeof vId>;

            return [vId, pm] as const;
        })
    );
    const queryObj = Object.fromEntries(queryEntries) as {
        [V in VirtualChainId]: ObservablesQueryMap<V>;
    };

    return { event: eventObj, storage: queryObj } as const;
})();

/**
 * TODO! tests + docs
 */
