import { ChainId, knownRelays, RelayId } from "@lambdas/app-support";

/**
 * Check if `chainId` is the Id of a relay chain
 */
export function isRelay(chainId: ChainId): boolean {
    return chainId in knownRelays;
}

/**
 * Get the relay chainId for a given chain ID
 */
export function getRelayId(chainId: ChainId): RelayId {
    const relayId = knownRelays.find((relay) => chainId.startsWith(relay));
    if (!relayId) {
        throw new Error(`No relay found for chainID: ${chainId}`);
    }
    return relayId;
}
