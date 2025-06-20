import * as D from "@polkadot-api/descriptors";
import { TypedApi } from "polkadot-api";
import { ChainId, Config, ToVirtual } from "./types";
import { SettingsConfiguration } from "./types/configurations";
import { Expand } from "./types/helpers";

/**
 * A mapping of some specified subset of all possible
 * `ChainId`s to their respective API.
 */
export type ContextualAPIs<Ids extends ChainId> = {
    [K in Ids as ToVirtual<K>]: TypedApi<(typeof D)[K]>;
};

export type ContextualSettings<Config extends readonly Config.Configuration[]> =
    {
        [K in keyof Config as Config[K] extends SettingsConfiguration
            ? Config[K]["fieldName"]
            : never]: Config[K] extends Config.SettingsConfiguration
            ? Config[K]["__fieldType"]
            : never;
    };

/**
 * Provides system context to lambda apps
 */
export class Context<
    Ids extends ChainId = ChainId,
    Config extends readonly Config.Configuration[] = []
> {
    constructor(
        /**
         * These are the APIs
         */
        public apis: Expand<ContextualAPIs<Ids>>,

        /**
         * These are the settings for the app.
         */
        public settings: Expand<ContextualSettings<Config>>
    ) {}
}
