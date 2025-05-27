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
 * ## WatchLeaf
 *
 * The smallest unit of a "thing to watch" under the `Observables` umbrella.
 * Regardless of which root path we take from `Observables`, all leaves share this
 * common structure. One `WatchLeaf` always corresponds to a single "entity".
 *
 * We can handle more complex watch patterns in a single `TRoute` with lists of
 * `WatchLeaf`s, or by using a higher level, builder pattern based `WatchCollection` class.
 *
 * @property chain - The chain this leaf is for
 * @property path - The full path to some "entity" we intend to watch
 * @property args - The arguments to pass to the observable, e.g. `["some-id"]`
 * @property options - Additional options for the observable, e.g. `{ finalized: true }`
 */
export type WatchLeaf<
    C extends ChainId = ChainId,
    P extends string = string,
    A extends any[] = any[],
    O extends object = any
> = Expand<{ chain: C; path: P; args: A; options: O }>;

/**
 * Options for `Observables.event` leaves
 */
export class EventOptions {
    constructor(options: {} = {}) {}
}

/**
 * Options for `Observables.storage` leaves
 */
export class StorageOptions {
    /**
     * Specifies whether to hold off on triggering until a change to this leaf's storage
     * item is finalized— or trigger immedidately when any changes are detected on the "best" block.
     *
     * You should only want to set this to `false` if you are doing something that is time sensitive and
     * can handle changes being reverted at some point in the near future (e.g. real-time gaming or messaging).
     *
     * Defaults to `true`.
     */
    finalized?: boolean;

    /**
     * Optionally trigger only on updates/inserts, or only deletions, of the storage
     * item being watched. If not specified, all changes will trigger.
     */
    changeType?: "upsert" | "deleted";

    constructor(
        options: { finalized?: boolean; changeType?: "upsert" | "deleted" } = {}
    ) {
        this.finalized = options.finalized;
        this.changeType = options.changeType;
    }
}

/**
 * A recursive type that translates a single blockchains `event` & `storage`
 * descriptors into a Substrate Lambdas `Observables` sub-tree.
 */
export type FuncTree<T, P extends string, C extends ChainId> = {
    [K in keyof T]: T[K] extends StorageDescriptor<infer Keys, any, any, any>
        ? // Storage leaf
          (
              ...args: [...PartialArgs<Keys>, options?: Expand<StorageOptions>]
          ) => [WatchLeaf<C, `${P}.${K & string}`, PartialArgs<Keys>, {}>]
        : T[K] extends PlainDescriptor<any>
        ? // Event leaf
          (
              ...args: [options?: Expand<EventOptions>]
          ) => [WatchLeaf<C, `${P}.${K & string}`, [], {}>]
        : // Recurse next layer of tree
          FuncTree<T[K], P extends "" ? K & string : `${P}.${K & string}`, C>;
};

/**
 *  Builds a `FuncTree` for a given chain's `descriptors` object.
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
        return (...args: any[]) => {
            const lastArg = args[args.length - 1];
            let options = {};
            let actualArgs = args;
            if (
                /**
                 * Is the last argument an "options" object?
                 *
                 * NOTE! In the case that no options are provided, and the last given key
                 * is an object who's properties all match the available properties some
                 * "options" object, then this will give a false positive, mistakenly eating
                 * a key as our "options".
                 *
                 * The chances of this conflict actually happening are very low, so for now
                 * we accept this potential edge case for the sake of nice API design.
                 */
                typeof lastArg === "object" &&
                (Object.keys(lastArg).every((key) =>
                    Object.keys(new StorageOptions()).find(
                        (possibleKey) => key == possibleKey
                    )
                ) ||
                    Object.keys(lastArg).every((key) =>
                        Object.keys(new EventOptions()).find(
                            (possibleKey) => key == possibleKey
                        )
                    ))
            ) {
                options = lastArg;
                actualArgs = args.slice(0, -1);
            }

            return [{ chain, path: prefix, args: actualArgs, options }];
        };
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

/**
 * An `event` FuncTree for a blockchain given by `V`.
 */
type ObservablesEventMap<V extends VirtualChainId> = FuncTree<
    (typeof D)[FromVirtual<V>]["descriptors"]["pallets"]["__event"],
    `event`,
    FromVirtual<V>
>;

/**
 * A `storage` FuncTree for a blockchain given by `V`.
 */
type ObservablesStorageMap<V extends VirtualChainId> = FuncTree<
    (typeof D)[FromVirtual<V>]["descriptors"]["pallets"]["__storage"],
    `storage`,
    FromVirtual<V>
>;

/**
 * The root `Observables` type.
 */
type ObservablesMap = {
    event: { [V in VirtualChainId]: ObservablesEventMap<V> };
    storage: { [V in VirtualChainId]: ObservablesStorageMap<V> };
};

/**
 * ## Observables
 *
 * The root `Observables` object.
 *
 * TODO! docs here
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
            )) as ObservablesStorageMap<typeof vId>;

            return [vId, pm] as const;
        })
    );
    const queryObj = Object.fromEntries(queryEntries) as {
        [V in VirtualChainId]: ObservablesStorageMap<V>;
    };

    return { event: eventObj, storage: queryObj } as const;
})();

if (import.meta.vitest) {
    const { test, expect, describe } = import.meta.vitest;
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

    describe("Capture WatchLeaf `options`", () => {
        test("Extracts `options` when available", () => {
            expect(
                Observables.storage.polkadotAssetHub.Balances.Account(
                    "some-id",
                    { finalized: true }
                )
            ).toEqual([
                {
                    chain: "polkadot_asset_hub",
                    path: "storage.Balances.Account",
                    args: ["some-id"],
                    options: {
                        finalized: true,
                    },
                },
            ]);

            expect(
                Observables.storage.polkadot.Staking.ErasStakersPaged(
                    10,
                    "some-id",
                    { changeType: "upsert" }
                )
            ).toEqual([
                {
                    chain: "polkadot",
                    path: "storage.Staking.ErasStakersPaged",
                    args: [10, "some-id"],
                    options: {
                        changeType: "upsert",
                    },
                },
            ]);

            expect(
                Observables.storage.polkadotAssetHub.Balances.Account({
                    finalized: true,
                })
            ).toEqual([
                {
                    chain: "polkadot_asset_hub",
                    path: "storage.Balances.Account",
                    args: [],
                    options: {
                        finalized: true,
                    },
                },
            ]);
        });

        test("options should be empty when no options given", () => {
            expect(
                Observables.storage.polkadotAssetHub.Balances.Account()
            ).toEqual([
                {
                    chain: "polkadot_asset_hub",
                    path: "storage.Balances.Account",
                    args: [],
                    options: {},
                },
            ]);
        });

        test("Decide last argument is *not* options even when it is a object shaped key", () => {
            const st_obs =
                Observables.storage.polkadotAssetHub.PolkadotXcm.SupportedVersion(
                    10,
                    {
                        type: "V2",
                        value: {
                            parents: 43,
                            interior: {
                                type: "Here",
                                value: undefined,
                            },
                        },
                    }
                );
            expect(st_obs).toEqual([
                {
                    chain: "polkadot_asset_hub",
                    path: "storage.PolkadotXcm.SupportedVersion",
                    args: [
                        10,
                        {
                            type: "V2",
                            value: {
                                parents: 43,
                                interior: {
                                    type: "Here",
                                    value: undefined,
                                },
                            },
                        },
                    ],
                    options: {},
                },
            ]);
        });
    });
}
