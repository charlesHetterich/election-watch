import * as D from "@polkadot-api/descriptors";
import { ChainDefinition, TypedApi } from "polkadot-api";

/**
 * Set of Id's for all chains with available descriptors
 */
export type ChainId =
    | {
          [K in keyof typeof D]: (typeof D)[K] extends ChainDefinition
              ? K
              : never;
      }[keyof typeof D];

/**
 * Set of Id's for all relay chains with available descriptors.
 *
 * A subset of `ChainId`.
 */
export type RelayId = ChainId &
    ("polkadot" | "ksmcc3" | "westend2" | "paseo" | "rococo_v2_2");

/**
 * All chains with available descriptors. (Real value equivalent of `ChainId` set)
 */
export const knownChains: ChainId[] = (
    Object.keys(D) as (keyof typeof D)[]
).filter(
    (k): k is ChainId =>
        typeof (D as any)[k] === "object" && "descriptors" in (D as any)[k]
);

/**
 * All relay chains with available descriptors. (Real value equivalent of `RelayId` set)
 */
export const knownRelays: RelayId[] = knownChains.filter((id): id is RelayId =>
    // TODO! How to make this hard-coded list
    //       less fragile against PAPI updates?
    ["polkadot", "ksmcc3", "westend2", "paseo", "rococo_v2_2"].includes(id)
);

/**
 * Convert a `ChainId` string to a `VirtualChainId`
 *
 * Transforms snake case variable names to camel case, to be more typescript idiomatic.
 * (ex: `polkadot_asset_hub` → `polkadotAssetHub`)
 */
export type ToVirtual<S extends string> =
    S extends `${infer Head}_${infer Tail}`
        ? Tail extends `${number}${string}`
            ? `${Head}.${ToVirtual<Tail>}`
            : `${Head}${Capitalize<ToVirtual<Tail>>}`
        : S;

/**
 * Expose a `VirtualChainId` set for chain selection in apps
 */
export type VirtualChainId = ToVirtual<ChainId>;

/**
 * Convert a `ChainId` to a `VirtualChainId`
 */
export function toVirtual(chainId: ChainId): VirtualChainId {
    return chainId
        .replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
        .replace(/_/, (_, ch) => ".") as VirtualChainId;
}

/**
 * Convert a `VirtualChainId` to a `ChainId`
 */
export type FromVirtual<V extends VirtualChainId> = {
    [K in ChainId]: V extends ToVirtual<K> ? K : never;
}[ChainId];

/**
 * Convert a `ChainId` to its corresponding `TypedApi`
 */
export type ToApi<C extends ChainId> = {
    [K in keyof typeof D]: (typeof D)[K] extends ChainDefinition
        ? TypedApi<(typeof D)[K]>
        : never;
}[C];
