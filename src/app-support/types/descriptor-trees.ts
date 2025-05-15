import { PathMap } from "./helpers";
import * as D from "@polkadot-api/descriptors";

/**
 * Set of Id's for all chains with available descriptors
 */
export type ChainId =
    | {
          [K in keyof typeof D]: (typeof D)[K] extends {
              descriptors: any;
          }
              ? K
              : never;
      }[keyof typeof D];

/**
 * Convert a `ChainId` string to a `VirtualChainId`
 */
export type ToVirtual<S extends string> =
    S extends `${infer Head}_${infer Tail}`
        ? Tail extends `${number}${string}`
            ? `${Head}.${ToVirtual<Tail>}`
            : `${Head}${Capitalize<ToVirtual<Tail>>}`
        : S;

/**
 * Convert a `VirtualChainId` to a `ChainId`
 */
export type FromVirtual<V extends VirtualChainId> = {
    [K in ChainId]: V extends ToVirtual<K> ? K : never;
}[ChainId];
/**
 * Convert a `ChainId` to a `VirtualChainId`
 */
export function toVirtual(chainId: ChainId): VirtualChainId {
    return chainId
        .replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
        .replace(/_/, (_, ch) => ".") as VirtualChainId;
}

/**
 * Expose a `VirtualChainId` type for apps selecting chains
 */
export type VirtualChainId = ToVirtual<ChainId>;

export const knownChains: ChainId[] = (
    Object.keys(D) as (keyof typeof D)[]
).filter(
    (k): k is ChainId =>
        typeof (D as any)[k] === "object" && "descriptors" in (D as any)[k]
);
export const _from_virtual = {} as Record<VirtualChainId, ChainId>;
for (const chainId of knownChains) {
    _from_virtual[toVirtual(chainId)] = chainId;
}
function fromVirtual(virtualChainId: VirtualChainId): ChainId {
    return _from_virtual[virtualChainId];
}

async function buildPaths<T, P extends string>(
    prefix: P,
    tree: T
): Promise<PathMap<T, P> | Promise<string>> {
    const out = {} as any;
    let isLeaf = true;
    for (const key of Object.keys(tree) as Array<keyof T>) {
        const node = (tree as any)[key];
        const q = prefix ? `${prefix}.${key as string}` : (key as string);

        if (node && typeof node === "object" && "_type" in node) {
            out[key] = await q;
        } else {
            out[key] = await buildPaths(q as any, node);
            isLeaf = false;
        }
    }
    if (isLeaf) {
        return prefix as string;
    }
    return out;
}

type ObservablesEventMap = {
    [V in VirtualChainId]: PathMap<
        (typeof D)[FromVirtual<V>]["descriptors"]["pallets"]["__event"],
        `${FromVirtual<V>}.event`
    >;
};

type ObservablesQueryMap = {
    [V in VirtualChainId]: PathMap<
        (typeof D)[FromVirtual<V>]["descriptors"]["pallets"]["__storage"],
        `${FromVirtual<V>}.query`
    >;
};
export const Observables = await (async () => {
    // Build event tree
    const eventEntries = await Promise.all(
        knownChains.map(async (id) => {
            const vId = toVirtual(id) as VirtualChainId;
            const d = await D[id].descriptors;

            const pm = (await buildPaths(
                `${id}.event`,
                d.events
            )) as ObservablesEventMap[typeof vId];

            return [vId, pm] as const; //  ←‑ literal key preserved
        })
    );
    const eventObj = Object.fromEntries(eventEntries) as ObservablesEventMap;

    // Build query tree
    const queryEntries = await Promise.all(
        knownChains.map(async (id) => {
            const vId = toVirtual(id) as VirtualChainId;
            const d = await D[id].descriptors;

            const pm = (await buildPaths(
                `${id}.query`,
                d.storage
            )) as ObservablesQueryMap[typeof vId];

            return [vId, pm] as const;
        })
    );
    const queryObj = Object.fromEntries(queryEntries) as ObservablesQueryMap;

    return { event: eventObj, query: queryObj } as const;
})();
