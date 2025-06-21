import * as D from "@polkadot-api/descriptors";

import { PossiblePayload } from "./payload";
import { WatchLeaf } from "./observables";
import { Context } from "../context";
import * as Config from "./configurations";

/**
 * Specifies a single route within an lambda application.
 *
 * A route listens to any single `Observable` path and takes some actionupon some conditions being satisfied.
 *
 * @property watching - The path to the `Observable` to watch
 * @property trigger  - Specifies the conditions under which we will take some `lambda` action
 * @property lambda   - The action to upon `trigger`'s conditions being satisfied
 */
export type Route<
    WLs extends readonly WatchLeaf[] = readonly WatchLeaf[],
    WLss extends readonly WLs[] = [WLs],
    Config extends readonly Config.Configuration[] = readonly Config.Configuration[]
> = {
    /**
     * ## watching
     *
     * DOCS! explain `watching` property
     */
    watching: WLs;

    /**
     * ## trigger
     *
     * DOCS! explain the `trigger` function
     */
    trigger: (
        payload: PossiblePayload<WLs>,
        context: Expand<Context<WLss[number][number]["chain"], Config>>
    ) => boolean | Promise<boolean>;

    /**
     * ## lambda
     *
     * DOCS! explain the `lambda` function
     */
    lambda: (
        payload: PossiblePayload<WLs>,
        context: Expand<Context<WLss[number][number]["chain"], Config>>
    ) => void | Promise<void>;
};

/**
 * Specifies a complete lambda application as a collection of routes and some peripheral settings.
 */
export interface AppModule<
    WLss extends readonly WatchLeaf[][] = WatchLeaf[][],
    Config extends readonly Config.Configuration[] = Config.Configuration[]
> {
    config: Config;
    routes: { [K in keyof WLss]: Route<WLss[K], WLss, Config> };
}

/**
 * Convenience builder function for specifying a lambda `TAppModule` with built-in type hints.
 */
export function App<
    const WLss extends readonly WatchLeaf[][],
    const Config extends readonly Config.Configuration[]
>(
    config: Config,
    ...routes: { [K in keyof WLss]: Route<WLss[K], WLss, Config> }
): AppModule<WLss, Config> {
    return {
        config,
        routes,
    };
}

/**
 * ## TApp
 *
 * Convenience type accessor when working outside of the {@link App} function
 *
 * ```ts
 * import { TApp } from "@lambdas/app-support";
 * import app from "./index";
 *
 * type App = TApp<typeof app>;
 *
 * function foo(
 *     transfer: App["Routes"]["0"]["Payload"],
 *     api: App["Context"]["apis"]["polkadot"]
 * ) { }
 * ```
 */
export type TApp<AppM extends AppModule<any, any>> = {
    Routes: {
        [K in Extract<keyof AppM["routes"], `${number}`>]: {
            Payload: PossiblePayload<AppM["routes"][K]["watching"]>;
            RTrigger: ReturnType<AppM["routes"][K]["trigger"]>;
        };
    };
    Context: AppM extends AppModule<infer WLss, infer _>
        ? Context<WLss[number][number]["chain"]>
        : never;
};

import type { TypedApi } from "polkadot-api";
import { Expand } from "./helpers";
if (import.meta.vitest) {
    const { test, expectTypeOf } = import.meta.vitest;
    const { Observables } = await import("./observables");

    test("`App` function propagates correct payload type", () => {
        App([Config.Description("test")], {
            watching: Observables.event.polkadot.Bounties.BountyProposed(),
            trigger: (payload, _) => {
                expectTypeOf<typeof payload>().toEqualTypeOf<
                    D.PolkadotEvents["Bounties"]["BountyProposed"]
                >();
                return true;
            },
            lambda: (payload, _) => {
                expectTypeOf<typeof payload>().toEqualTypeOf<
                    D.PolkadotEvents["Bounties"]["BountyProposed"]
                >();
            },
        });
    });

    test("`App` function correctly propagates many depended on chains through context", () => {
        App(
            [Config.Description("test")],
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

    test("`TApp` correctly organizes types extracted from an `AppModule` instance", () => {
        const app = App(
            [Config.Description("test")],
            {
                watching: Observables.event.polkadot.Bounties.BountyProposed(),
                trigger: (_, c) => true,
                lambda: (_, __) => {},
            },
            {
                watching:
                    Observables.event.rococoV2_2.Bounties.BountyProposed(),
                trigger: (_, __) => true,
                lambda: (_, c) => {},
            }
        );

        type A = TApp<typeof app>;
        expectTypeOf<A["Routes"]["0"]["Payload"]>().toEqualTypeOf<
            D.PolkadotEvents["Bounties"]["BountyProposed"]
        >();
        expectTypeOf<A["Routes"]["1"]["Payload"]>().toEqualTypeOf<
            D.Rococo_v2_2Events["Bounties"]["BountyProposed"]
        >();
        expectTypeOf<A["Context"]["apis"]>().toEqualTypeOf<{
            polkadot: TypedApi<(typeof D)["polkadot"]>;
            rococoV2_2: TypedApi<(typeof D)["rococo_v2_2"]>;
        }>();
    });
}
