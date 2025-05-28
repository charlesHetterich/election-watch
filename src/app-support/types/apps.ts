import * as D from "@polkadot-api/descriptors";

import { Payload } from "./payload";
import { WatchLeaf } from "./descriptor-trees";
import { Context } from "../context";

/**
 * The expected type of a payload for a given `WatchPath`
 */

/**
 * Specifies a single route within an lambda application.
 *
 * A route listens to any single `Observable` path and takes some actionupon some conditions being satisfied.
 *
 * @property watching - The path to the `Observable` to watch
 * @property trigger  - Specifies the conditions under which we will take some `lambda` action
 * @property lambda   - The action to upon `trigger`'s conditions being satisfied
 */
export interface TRoute<
    WP extends WatchLeaf[],
    WPs extends readonly WatchLeaf[][] = [WP]
> {
    watching: WP;
    trigger: (
        payload: Payload<WP[0]>, // TODO! should be union of all WatchLeafs
        context: Context<WPs[number][number]["chain"]>
    ) => boolean | Promise<boolean>;
    lambda: (
        payload: Payload<WP[0]>, // TODO! should be union of all WatchLeafs
        context: Context<WPs[number][number]["chain"]>
    ) => void | Promise<void>;
}

/**
 * Specifies a complete lambda application as a collection of routes and some peripheral settings.
 */
export interface TAppModule<WPs extends readonly WatchLeaf[][]> {
    description: string;
    routes: { [K in keyof WPs]: TRoute<WPs[K], WPs> };
}

/**
 * Convenience builder function for specifying a lambda `TAppModule` with built-in type hints.
 */
export function App<const WPs extends readonly WatchLeaf[][]>(
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

    test("`Payload` should capture correct `Observable` payload for a given `WatchPath`", () => {
        expectTypeOf<
            Payload<{
                chain: "polkadot";
                path: "event.doesnt.exist";
                args: [];
                options: {};
            }>
        >().toEqualTypeOf<never>();

        const ev_obs = Observables.event.polkadot.Balances.Transfer();
        expectTypeOf<Payload<(typeof ev_obs)[number]>>().toEqualTypeOf<{
            from: SS58String;
            to: SS58String;
            amount: bigint;
        }>();

        const st_obs =
            Observables.storage.polkadotAssetHub.Balances.Account("some-id");
        expectTypeOf<Payload<(typeof st_obs)[number]>>().toEqualTypeOf<{
            key: [SS58String];
            value: {
                free: bigint;
                reserved: bigint;
                frozen: bigint;
                flags: bigint;
            };
        }>();

        const st2_obs = Observables.storage.polkadotAssetHub.System.Number();
        expectTypeOf<Payload<(typeof st2_obs)[number]>>().toEqualTypeOf<{
            key: [];
            value: number;
        }>();
    });

    test("`App` function propagates correct payload type", () => {
        App("test", {
            watching: Observables.event.polkadot.Bounties.BountyProposed(),
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
                watching: Observables.event.polkadot.Bounties.BountyProposed(),
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
                watching:
                    Observables.event.rococoV2_2.Bounties.BountyProposed(),
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

    test("test123", async () => {
        const polkadot = D.polkadot;
    });
}
