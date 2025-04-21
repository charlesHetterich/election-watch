import { ChainDefinition, TypedApi } from "polkadot-api";

/**
 * Provides system context to lambda apps
 */
export class Context<T extends ChainDefinition> {
    constructor(public api: TypedApi<T>) {}
}
