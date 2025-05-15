import * as D from "@polkadot-api/descriptors";

import { DeepLookup, DescriptorTree } from "./helpers";
import { ChainId } from "./descriptor-trees";
import { Context } from "../context";

/**
 * Expected format of a `<TRoute>.watching` string:
 */
export type WatchPath = `${ChainId}.${string}`;

/**
 * Type alias for `DeepLookup` exposed for apps
 */
export type Payload<Path extends readonly string[] | string> =
    Path extends `${infer C}.${infer Rest}`
        ? C extends ChainId
            ? DeepLookup<
                  {
                      event: DescriptorTree<
                          (typeof D)[C]["descriptors"]["pallets"]["__event"]
                      >;
                      query: DescriptorTree<
                          (typeof D)[C]["descriptors"]["pallets"]["__storage"]
                      >;
                  },
                  Rest
              >
            : never
        : never;

export interface TRoute<WP extends WatchPath, WPs extends WatchPath[] = []> {
    watching: WP;
    trigger: (
        payload: Payload<WP>,
        context: Context<
            WP extends `${infer C}.${string}`
                ? C extends ChainId
                    ? (typeof D)[C]
                    : never
                : never
        >
    ) => boolean | Promise<boolean>;
    lambda: (
        payload: Payload<WP>,
        context: Context<
            WP extends `${infer C}.${string}`
                ? C extends ChainId
                    ? (typeof D)[C]
                    : never
                : never
        >
    ) => void | Promise<void>;
}

export interface TAppModule<WPs extends WatchPath[]> {
    description: string;
    routes: { [K in keyof WPs]: TRoute<WPs[K], WPs> };
}

export function App<WPs extends WatchPath[]>(
    description: string,
    ...routes: { [K in keyof WPs]: TRoute<WPs[K], WPs> }
): TAppModule<WPs> {
    return {
        description,
        routes: routes,
    };
}
