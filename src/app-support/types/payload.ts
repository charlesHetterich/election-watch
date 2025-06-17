import * as D from "@polkadot-api/descriptors";
import { PlainDescriptor, StorageDescriptor } from "polkadot-api";

import { Split } from "./helpers";
import { WatchLeaf } from "./observables";
import { ROOTS } from "../types/observables";
import { Context } from "../context";
import { Route } from "./apps";

/**
 * Extract specific type inside of a descriptor tree, given by a list of type strings
 */
export type PayloadLookup<
    TreeNode,
    Path extends readonly string[]
> = Path extends [infer K, ...infer Rest extends string[]]
    ? // Pop top key from path More path— dig deeper
      K extends keyof TreeNode
        ? PayloadLookup<TreeNode[K], Rest>
        : never
    : // Storage leaf
    TreeNode extends StorageDescriptor<infer Key, infer Value, any, any>
    ? ROOTS.storage.PayloadStructure<Key, Value>
    : // Event leaf
    TreeNode extends PlainDescriptor<infer Value>
    ? ROOTS.event.PayloadStructure<Value>
    : never;

/**
 * The expected type of a payload for a given `WatchLeaf`
 */
export type Payload<WL extends WatchLeaf> = PayloadLookup<
    {
        event: (typeof D)[WL["chain"]]["descriptors"]["pallets"]["__event"];

        storage: (typeof D)[WL["chain"]]["descriptors"]["pallets"]["__storage"];
    },
    Split<WL["path"]>
>;

/**
 * Intersection of all possible payload types for a given array of `WatchLeaf`s.
 *
 * Use {@link narrowPayload} to narrow the payload type
 */
export type PossiblePayload<WLs extends readonly WatchLeaf[]> = WLs extends [
    infer W extends WatchLeaf
]
    ? Payload<W>
    : WLs extends readonly [
          infer First extends WatchLeaf,
          ...infer Rest extends readonly WatchLeaf[]
      ]
    ? Payload<First> | PossiblePayload<Rest>
    : any;

/**
 * Reveals hidden properties on a payload
 *
 * Intended for internal use only
 */
type PayloadExtension = {
    __meta: {
        chain: WatchLeaf["chain"];
        path: WatchLeaf["path"];
    };
};
/**
 * Alias for {@link PayloadExtension} exposed for experimental use
 */
export type _PayloadExtension = PayloadExtension;

/**
 * Conditionally make a payload's type narrowed, when working
 * with payloads from more than one `WatchLeaf`
 */
export function narrowPayload<T extends WatchLeaf>(
    payload: Payload<any>,
    watchLeaf: T
): payload is Payload<T> {
    const _payload = payload as PayloadExtension;
    return (
        _payload.__meta.chain === watchLeaf.chain &&
        _payload.__meta.path === watchLeaf.path
    );
}

/**
 * TODO! docs
 */
export async function processPayload<T extends WatchLeaf[]>(
    payload: PossiblePayload<T>,
    context: Context,
    trigger: Route<T>["trigger"],
    lambda: Route<T>["lambda"]
) {
    if (await trigger(payload, context)) {
        lambda(payload, context);
    }
}

if (import.meta.vitest) {
    const { test, expect, expectTypeOf } = import.meta.vitest;
    const { Observables } = await import("./observables");

    test("should give `never` on `WatchLeaf` with invalid path", () => {
        expectTypeOf<
            Payload<{
                chain: "polkadot";
                path: "event.doesnt.exist";
                args: [];
                options: {};
            }>
        >().toEqualTypeOf<never>();
    });

    test("`should capture paylaods of *event observables*", () => {
        const obs = Observables.event.polkadot.Balances.Transfer();
        expectTypeOf<Payload<(typeof obs)[number]>>().toEqualTypeOf<
            D.PolkadotEvents["Balances"]["Transfer"]
        >();
    });
    test("`should capture paylaods of *storage observables* with keys", () => {
        const obs =
            Observables.storage.polkadotAssetHub.Balances.Account("some-id");
        expectTypeOf<Payload<(typeof obs)[number]>>().toEqualTypeOf<
            ROOTS.storage.PayloadStructure<
                D.Polkadot_asset_hubQueries["Balances"]["Account"]["KeyArgs"],
                D.Polkadot_asset_hubQueries["Balances"]["Account"]["Value"]
            >
        >();
    });
    test("`should capture paylaods of *storage observables* with no keys", () => {
        const obs = Observables.storage.polkadotAssetHub.System.Number();
        expectTypeOf<Payload<(typeof obs)[number]>>().toEqualTypeOf<
            ROOTS.storage.PayloadStructure<
                D.Polkadot_asset_hubQueries["System"]["Number"]["KeyArgs"],
                D.Polkadot_asset_hubQueries["System"]["Number"]["Value"]
            >
        >();
    });

    test("`PossiblePayload` gives union of payloads", () => {
        const watching = [
            Observables.event.polkadot.Balances.Transfer()[0],
            Observables.storage.polkadotAssetHub.Balances.Account("some-id")[0],
        ] as const;
        const payload = {} as PossiblePayload<typeof watching>;

        expectTypeOf<typeof payload>().toEqualTypeOf<
            | D.PolkadotEvents["Balances"]["Transfer"]
            | ROOTS.storage.PayloadStructure<
                  D.Polkadot_asset_hubQueries["Balances"]["Account"]["KeyArgs"],
                  D.Polkadot_asset_hubQueries["Balances"]["Account"]["Value"]
              >
        >;
    });

    test("payloads inside of a `narrowPayload` branch should properly narrow according to the given `WatchLeaf`'s", () => {
        const watching = [
            Observables.event.polkadot.Balances.Transfer()[0],
            Observables.storage.polkadotAssetHub.Balances.Account("some-id")[0],
        ] as const;
        const payload = { __meta: {} } as unknown as PossiblePayload<
            typeof watching
        >;

        expectTypeOf<typeof payload>().not.toEqualTypeOf<
            D.PolkadotEvents["Balances"]["Transfer"]
        >;
        if (narrowPayload(payload, watching[0])) {
            expectTypeOf<typeof payload>().toEqualTypeOf<
                D.PolkadotEvents["Balances"]["Transfer"]
            >;
        }
    });

    test("`narrowPayload` should only return true on relevant payloads", () => {
        const watching = [
            Observables.event.polkadot.Balances.Withdraw()[0],
            Observables.event.polkadotAssetHub.Balances.Issued()[0],
        ] as const;

        const withdrawPayload = {
            who: "",
            amount: "",
            __meta: {
                chain: "polkadot",
                path: "event.Balances.Withdraw",
            },
        };
        expect(narrowPayload(withdrawPayload, watching[0])).toEqual(true);
        expect(narrowPayload(withdrawPayload, watching[1])).toEqual(false);
    });
}
