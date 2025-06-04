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
import { TRoute } from "./apps";

/**
 * ## WatchLeaf
 *
 * The smallest unit of a "thing to watch" under the `Observables` umbrella.
 * Regardless of which root path we take from `Observables`, all leaves share this
 * common structure. One `WatchLeaf` always corresponds to a single "entity".
 *
 * We can handle more complex watch patterns in a single {@link TRoute} with lists of
 * `WatchLeaf`s, or by using a higher level, builder pattern based `WatchCollection` class.
 *
 * @property chain   - The chain this leaf is for
 * @property path    - The full path to some "entity" we intend to watch
 * @property args    - The arguments to pass to the observable, e.g. `["some-id"]`
 * @property options - Additional options for the observable, e.g. `{ finalized: true }`
 */
export type WatchLeaf<
    CId extends ChainId = ChainId,
    Pth extends string = string,
    Arg extends any[] = any[],
    Opt extends object = EventOptions & StorageOptions
> = Expand<{ chain: CId; path: Pth; args: Arg; options: Opt }>;

/**
 * Options for a {@link WatchLeaf} leaf for an *event observable*
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
 * ## LeafFunction
 *
 * The leaf-node of a {@link FuncTree}. A function which may take arguments,
 * and produces a list of {@link WatchLeaf}s. All `LeafFunction`'s are accessed
 * via {@link Observables}.
 *
 * ```
 * // Produces a single watch leaf watching the `Balances.Transfer`
 * Observables.event.polkadot.Balances.Transfer();
 *
 * // Produces a single watch leaf with args `[some-account-id]`
 * Observables.storage.polkadot.Balances.Account("some-account-id");
 *
 * // Produces many watch leaves
 * Observables.event.polkadot.all();
 * ```
 *
 * @template WLs  The type of `WatchLeaf`s this function returns
 * @template Arg The type of arguments this function takes
 */
type LeafFunction<
    WLs extends readonly WatchLeaf[] = WatchLeaf[],
    Arg extends readonly any[] = any[]
> = (...args: Arg) => WLs;

/**
 * A recursive type that translates a single blockchains `event` & `storage`
 * descriptors into a Substrate Lambdas `Observables` sub-tree.
 *
 * @template T             - The type of the descriptors tree for this chain
 * @template Pth           - The path to this point in the tree, e.g. `event.Balances.Transfer`
 * @template CId           - The chain this tree is for
 * @template TreeExtension - Additional properties to add to each node in the tree
 */
export type FuncTree<
    T = unknown,
    Pth extends string = string,
    CId extends ChainId = ChainId,
    TreeExtension = {}
> = {
    [K in keyof T]: T[K] extends StorageDescriptor<infer Keys, any, any, any>
        ? // Storage leaf
          LeafFunction<
              [WatchLeaf<CId, `${Pth}.${K & string}`, PartialArgs<Keys>>],
              [...PartialArgs<Keys>, options?: Expand<StorageOptions>]
          >
        : T[K] extends PlainDescriptor<any>
        ? // Event leaf
          LeafFunction<
              [WatchLeaf<CId, `${Pth}.${K & string}`, []>],
              [options?: Expand<EventOptions>]
          >
        : // Subtree node
          FuncTree<
              T[K],
              Pth extends "" ? K & string : `${Pth}.${K & string}`,
              CId,
              TreeExtension
          >;
} & TreeExtension;

/**
 * Utility type to extract all WatchLeaf types within a tree structure
 */
type ExtractLeaves<T extends FuncTree | LeafFunction> = T extends LeafFunction
    ? ReturnType<T>
    : T[keyof T] extends FuncTree | LeafFunction
    ? ExtractLeaves<T[keyof T]>
    : never;

export const EventTreeExtension = {
    /**
     * Watch all *observables* under this event tree node
     *
     * @param options - Options applied to all leaves in this tree
     */
    all<const Self extends FuncTree, O extends Expand<EventOptions>>(
        this: Self,
        options?: O
    ): ExtractLeaves<Self> {
        const leaves: WatchLeaf[] = [];

        for (const key of Object.keys(this as Record<string, unknown>)) {
            if (key in EventTreeExtension) continue;

            const subTree = (this as any)[key];

            if (typeof subTree === "function") {
                leaves.push(subTree(options));
            } else {
                leaves.push(...subTree.all(options));
            }
        }
        return leaves.flat() as ExtractLeaves<Self>;
    },
};

/**
 * Builds a `FuncTree` for a given chain's `descriptors` object.
 *
 * All members of our `tree` are either:
 * - An empty object, which we skip
 *    - This may happen, for example, under the *events* tree for a pallet with no events
 * - An object with members, which we recurse into
 * - A number, which represents a leaf
 *
 * @param chain - The Id of the chain this tree is for
 * @param prefix - The `.` separated path to this point in the tree
 * @param tree - A position within an `IDescriptors` tree.
 */
async function buildFuncTree(
    chain: ChainId,
    prefix: string,
    tree: any
): Promise<FuncTree | LeafFunction> {
    // Leaf node
    if (typeof tree == "number") {
        return ((...args: any[]) => {
            const lastArg = args[args.length - 1];
            let options = {};
            let actualArgs = args;
            if (
                /**
                 * Is the last argument an "options" object?
                 *
                 * NOTE! In the case that no options are provided, and the last given *key*
                 * is an object who's properties all match the available properties of some
                 * *options* object, then this will give a false positive, mistakenly eating
                 * a *key* as our *options*.
                 *
                 * The chances of this conflict actually happening are very low and an easy fix,
                 * (use builder pattern .withOptions() which internally creates an explicit
                 * `new StorageOptions()/EventOptions()`) so for now we accept this potential
                 * edge case for the sake of nice API design.
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
        }) satisfies LeafFunction;
    }

    // Recursive tree node
    const out = {} as any;
    for (const key of Object.keys(tree)) {
        const node = tree[key];
        if (typeof node != "number" && Object.keys(node).length == 0) continue;
        const nextPrefix = prefix
            ? `${prefix}.${key as string}`
            : (key as string);

        out[key] = await buildFuncTree(chain, nextPrefix, node);
    }

    /**
     * Handle {@link EventTreeExtension}
     */
    if (prefix.startsWith("event")) {
        Object.setPrototypeOf(out, EventTreeExtension);
    }
    return out;
}

/**
 * An `event` FuncTree for a blockchain given by `V`.
 */
type ObservablesEventMap<V extends VirtualChainId> = FuncTree<
    (typeof D)[FromVirtual<V>]["descriptors"]["pallets"]["__event"],
    `event`,
    FromVirtual<V>,
    typeof EventTreeExtension
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
 * Type of {@link Observables}.
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
            )) as unknown as ObservablesEventMap<typeof vId>;

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
    const { test, expect, describe, expectTypeOf } = import.meta.vitest;
    const { Observables } = await import("./observables");

    describe("WatchLeaf components & helpers", () => {
        describe("WatchLeaf options", () => {
            test("Make some StorageOptions", () => {
                const options = new StorageOptions({
                    finalized: true,
                });
                expect(options.finalized).toBe(true);
                expect(options.changeType).toBeUndefined();
            });
            test("Make some EventOptions", () => {
                const options = new EventOptions({});
                expect(options).toEqual({});
                expect(options).toBeInstanceOf(EventOptions);
            });
        });

        describe("Leaf Function", () => {
            const tmpLeaf = {
                chain: "polkadot",
                path: "storage.Balances.Account",
                args: ["some-id"],
                options: {},
            } satisfies WatchLeaf;
            test("Allow: function returning empty list", () => {
                const foo = () => {
                    return [];
                };
                expectTypeOf<typeof foo>().toExtend<LeafFunction>();
            });
            test("Allow: function returning list of WatchLeaf's", () => {
                const foo = () => {
                    return [tmpLeaf, tmpLeaf];
                };
                expectTypeOf<typeof foo>().toExtend<LeafFunction>();
            });
            test("Don't Allow: WatchLeaf not in a list", () => {
                const foo = () => {
                    return [{}];
                };
                expectTypeOf<typeof foo>().not.toExtend<LeafFunction>();
            });
            test("Don't Allow: function returning list of non-WatchLeaf objects", () => {
                const foo = () => {
                    return tmpLeaf;
                };
                expectTypeOf<typeof foo>().not.toExtend<LeafFunction>();
            });
        });
    });

    describe("Observables", () => {
        test("Pallets that exist on a chain, but are empty under for a given *observable root*, should not appear at all under that root", () => {
            /**
             * The `BeefyMmrLeaf` pallet exists on Polkadot. This pallet has storage but
             * emits no events. This should exist as a pallet under `storage`, but not `event`
             */
            expect(
                (Observables.event.polkadot as any).BeefyMmrLeaf
            ).toBeUndefined();
            expect(
                (Observables.storage.polkadot as any).BeefyMmrLeaf
            ).toBeDefined();
        });

        describe("Event root", () => {
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
            describe("`.all` Extension", () => {
                test("Pallet level .all() gives exact expected leaves", () => {
                    const leaves = Observables.event.polkadot.System.all();
                    const pths = leaves.map((l) => l.path);
                    expect(leaves).toHaveLength(7);
                    expect(pths).toContain("event.System.CodeUpdated");
                    expect(pths).toContain("event.System.ExtrinsicFailed");
                    expect(pths).toContain("event.System.ExtrinsicSuccess");
                    expect(pths).toContain("event.System.KilledAccount");
                    expect(pths).toContain("event.System.NewAccount");
                    expect(pths).toContain("event.System.Remarked");
                    expect(pths).toContain("event.System.UpgradeAuthorized");
                });
                test("Pallet level .all() propogates options correctly", () => {
                    /**
                     * For now, `EventOptions` are empty, so there's no options we can
                     * propogate & actually test. But we leave this here for when there
                     * are actually options for *event observables*
                     */
                    const leaves = Observables.event.polkadot.System.all();
                    const pths = leaves.map((l) => l.path);
                    expect(leaves[0].options).toEqual({});
                });
                test("Chain level .all() includes events across all pallets", () => {
                    // All leaves of expected type/shape
                    const leaves = Observables.event.polkadot.all();
                    const leafPallets = leaves.map((l) => {
                        expectTypeOf(l).toExtend<WatchLeaf>();
                        const pth_arr = l.path.split(".");
                        expect(pth_arr).toHaveLength(3);
                        expect(pth_arr[0]).toEqual("event");
                        return pth_arr[1];
                    });
                    const availablePallets = Object.keys(
                        Observables.event.polkadot
                    );
                    //Exactly the expected pallets are available
                    availablePallets.forEach((pallet) => {
                        expect(leafPallets).toContain(pallet);
                    });
                    leafPallets.forEach((pallet) => {
                        expect(availablePallets).toContain(pallet);
                    });
                });
            });
        });

        describe("Storage root", () => {
            test("Correct storage observable with key", () => {
                const st_obs =
                    Observables.storage.polkadotAssetHub.Balances.Account(
                        "some-id"
                    );
                expect(st_obs).toEqual([
                    {
                        chain: "polkadot_asset_hub",
                        path: "storage.Balances.Account",
                        args: ["some-id"],
                        options: {},
                    },
                ]);
            });

            describe("Keys & Options", () => {
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
        });
    });
}
