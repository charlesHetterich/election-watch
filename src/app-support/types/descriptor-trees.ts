import { PlainDescriptor, StorageDescriptor } from "polkadot-api";
import * as D from "@polkadot-api/descriptors";

import { Expand, PartialArgs } from "./helpers";
import {
    knownChains,
    toVirtual,
    FromVirtual,
    VirtualChainId,
    ChainId,
} from "./known-chains";

/**
 *
 */
export type WatchLeaf<
    C extends ChainId = ChainId,
    P extends string = string,
    A extends any[] = any[],
    O extends object = any
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

/**
 *
 */
async function buildFuncTree<
    C extends ChainId,
    P extends string,
    T extends object
>(
    chain: C,
    prefix: P,
    tree: T
): Promise<FuncTree<T, P, C> | Promise<() => [WatchLeaf]>> {
    // Leaf node
    if (Object.keys(tree).length === 0) {
        return (...args: any[]) => [{ chain, path: prefix, args, options: {} }];
    }

    // Recursive tree node
    const out = {} as any;
    for (const key of Object.keys(tree) as Array<keyof T>) {
        const node = (tree as any)[key];
        const nextPrefix = prefix
            ? `${prefix}.${key as string}`
            : (key as string);

        out[key] = await buildFuncTree(chain, nextPrefix, node);
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

/**
 *
 */
export const Observables: Readonly<ObservablesMap> = await (async () => {
    // Build event tree
    const eventEntries = await Promise.all(
        knownChains.map(async (id) => {
            const vId = toVirtual(id);
            const d = await D[id].descriptors;
            const pm = (await buildFuncTree(
                id,
                `event`,
                d.events
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
            const pm = (await buildFuncTree(
                id,
                `storage`,
                d.storage
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
if (import.meta.vitest) {
    const { test, expect } = import.meta.vitest;
    const { Observables } = await import("./descriptor-trees");

    test("Correct event observable", () => {
        const ev_obs = Observables.event.polkadot.Balances.Transfer();
        expect(ev_obs).toEqual([
            {
                chain: "polkadot",
                path: "event.Balances.Transfer",
                args: [],
                options: {},
            },
        ]);
    });

    test("Correct storage observable with key", () => {
        const st_obs =
            Observables.storage.polkadotAssetHub.Balances.Account("some-id");
        expect(st_obs).toEqual([
            {
                chain: "polkadot_asset_hub",
                path: "storage.Balances.Account",
                args: ["some-id"],
                options: {},
            },
        ]);
    });
}
