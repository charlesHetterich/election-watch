import * as D from "@polkadot-api/descriptors";
import { TypedApi } from "polkadot-api";
import { ChainId, ToVirtual } from "./types";

/**
 * A mapping of some specified subset of all possible
 * `ChainId`s to their respective API.
 */
export type ContextualAPIs<Ids extends ChainId> = {
    [K in Ids as ToVirtual<K>]: TypedApi<(typeof D)[K]>;
};

/**
 * Provides system context to lambda apps
 */
export class Context<Ids extends ChainId = ChainId> {
    constructor(public apis: ContextualAPIs<Ids>) {}
}
