import * as D from "@polkadot-api/descriptors";
import { PathMap } from "./helpers";
import {
    knownChains,
    toVirtual,
    FromVirtual,
    VirtualChainId,
} from "./known-chains";

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

            return [vId, pm] as const;
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
