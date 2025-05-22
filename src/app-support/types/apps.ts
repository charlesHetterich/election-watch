import * as D from "@polkadot-api/descriptors";

import { DeepLookup, DescriptorTree } from "./helpers";
import { ChainId } from "./known-chains";
import { Context } from "../context";

/**
 * Expected format of a `<TRoute>.watching` string:
 */
export type WatchPath = `${ChainId}.${string}`;

/**
 * Extract the `ChainId` and rest-of-path: `string` from a `WatchPath`
 */
export type PartsOf<WP extends WatchPath> =
    WP extends `${infer C}.${infer Rest}` ? [C, Rest] : never;

/**
 * The expected type of a payload for a given `WatchPath`
 */
export type Payload<WP extends WatchPath> = DeepLookup<
    {
        event: DescriptorTree<
            (typeof D)[PartsOf<WP>[0]]["descriptors"]["pallets"]["__event"]
        >;
        query: DescriptorTree<
            (typeof D)[PartsOf<WP>[0]]["descriptors"]["pallets"]["__storage"]
        >;
    },
    PartsOf<WP>[1]
>;

/**
 * Specifies a single route within an lambda application.
 *
 * A route listens to any single `Observable` path and takes some actionupon some conditions being satisfied.
 *
 * @property watching - The path to the `Observable` to watch
 * @property trigger  - Specifies the conditions under which we will take some `lambda` action
 * @property lambda   - The action to upon `trigger`'s conditions being satisfied
 */
export interface TRoute<WP extends WatchPath, WPs extends WatchPath[] = []> {
    watching: WP;
    trigger: (
        payload: Payload<WP>,
        context: Context<PartsOf<WPs[number]>[0]>
    ) => boolean | Promise<boolean>;
    lambda: (
        payload: Payload<WP>,
        context: Context<PartsOf<WPs[number]>[0]>
    ) => void | Promise<void>;
}

/**
 * Specifies a complete lambda application as a collection of routes and some peripheral settings.
 */
export interface TAppModule<WPs extends WatchPath[]> {
    description: string;
    routes: { [K in keyof WPs]: TRoute<WPs[K], WPs> };
}

/**
 * Convenience builder function for specifying a lambda `TAppModule` with built-in type hints.
 */
export function App<WPs extends WatchPath[]>(
    description: string,
    ...routes: { [K in keyof WPs]: TRoute<WPs[K], WPs> }
): TAppModule<WPs> {
    return {
        description,
        routes: routes,
    };
}

import type { SS58String, TypedApi } from "polkadot-api";
if (import.meta.vitest) {
    const { test, expectTypeOf } = import.meta.vitest;
    const { Observables } = await import("./descriptor-trees");

    test("`WatchPath` structured type strings", () => {
        expectTypeOf<"polkadot_asset_hub.event.balances.Transfer">().toExtend<WatchPath>();
        expectTypeOf<"not_a_chain.event.balances.Transfer">().not.toExtend<WatchPath>();
    });

    test("`PartsOf` should properly split ChainIds from `WatchPath`", () => {
        expectTypeOf<
            PartsOf<"polkadot.thisPart.can_be.Anything...">
        >().toEqualTypeOf<["polkadot", "thisPart.can_be.Anything..."]>();
    });

    test("`Payload` should capture correct `Observable` payload for a given `WatchPath`", () => {
        expectTypeOf<
            Payload<"polkadot.event.doesnt.exist">
        >().toEqualTypeOf<never>();
        expectTypeOf<
            Payload<typeof Observables.event.polkadot.Balances.Transfer>
        >().toEqualTypeOf<{
            from: SS58String;
            to: SS58String;
            amount: bigint;
        }>();
        expectTypeOf<
            Payload<typeof Observables.query.polkadotAssetHub.System.Number>
        >().toEqualTypeOf<number>();
    });

    test("`App` function propagates correct payload type", () => {
        App("test", {
            watching: Observables.event.polkadot.Bounties.BountyProposed,
            trigger: (payload, _) => {
                expectTypeOf<typeof payload>().toEqualTypeOf<{
                    index: number;
                }>();
                return true;
            },
            lambda: (payload, _) => {
                expectTypeOf<typeof payload>().toEqualTypeOf<{
                    index: number;
                }>();
            },
        });
    });

    test("`App` function correctly propagates many depended on chains through context", () => {
        App(
            "test",
            {
                watching: Observables.event.polkadot.Bounties.BountyProposed,
                trigger: (_, c) => {
                    expectTypeOf<typeof c.apis>().toEqualTypeOf<{
                        polkadot: TypedApi<(typeof D)["polkadot"]>;
                        rococoV2_2: TypedApi<(typeof D)["rococo_v2_2"]>;
                    }>();
                    return true;
                },
                lambda: (_, __) => {},
            },
            {
                watching: Observables.event.rococoV2_2.Bounties.BountyProposed,
                trigger: (_, __) => true,
                lambda: (_, c) => {
                    expectTypeOf<typeof c.apis>().toEqualTypeOf<{
                        polkadot: TypedApi<(typeof D)["polkadot"]>;
                        rococoV2_2: TypedApi<(typeof D)["rococo_v2_2"]>;
                    }>();
                },
            }
        );
    });
}
