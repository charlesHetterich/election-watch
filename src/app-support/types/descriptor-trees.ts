import { PathMap } from "./helpers";
import * as D from "@polkadot-api/descriptors";

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

export type ChainId = {
    [K in keyof typeof D]: (typeof D)[K] extends {
        descriptors: any;
    }
        ? K
        : never;
}[keyof typeof D];

export const CHAINS: ChainId[] = (Object.keys(D) as (keyof typeof D)[]).filter(
    (k): k is ChainId =>
        typeof (D as any)[k] === "object" && "descriptors" in (D as any)[k]
);

const allChainTrees = {} as Record<
    ChainId,
    {
        event: PathMap<any, string>;
        query: PathMap<any, string>;
    }
>;
for (const id of CHAINS) {
    const chainDescriptor = await D[id].descriptors;
    allChainTrees[id] = {
        event: (await buildPaths(
            `${id}.event`,
            chainDescriptor["events"]
        )) as PathMap<any, string>,
        query: (await buildPaths(
            `${id}.query`,
            chainDescriptor["storage"]
        )) as PathMap<any, string>,
    };
}

export const Observables = {
    event: <C extends ChainId>(chainId: C) =>
        allChainTrees[chainId].event as PathMap<
            (typeof D)[C]["descriptors"]["pallets"]["__event"],
            `${C}.event`
        >,
    query: <C extends ChainId>(chainId: C) =>
        allChainTrees[chainId].query as PathMap<
            (typeof D)[C]["descriptors"]["pallets"]["__storage"],
            `${C}.query`
        >,
};
