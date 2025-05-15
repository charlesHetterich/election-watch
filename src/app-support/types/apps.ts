import * as D from "@polkadot-api/descriptors";

import { DeepLookup, DescriptorTree } from "./helpers";
import { ChainId } from "./descriptor-trees";
import { Context } from "../context";

/**
 * Expected format of a `<TRoute>.watching` string:
 */
export type WatchPath = `${ChainId}.${string}`;

/**
 * Extract the `ChainId` and rest of path `string` from a `WatchPath`
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
