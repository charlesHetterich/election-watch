import { PolkadotClient, TypedApi } from "polkadot-api";
import * as chains from "polkadot-api/chains";

// TODO! this should be defined dynamically to
//       be less fragile against PAPI updates
const RELAYS = ["polkadot", "ksmcc3", "westend2", "paseo", "rococo_v2_2"];

/**
 * Check if `chainId` is the Id of a relay chain
 */
export function isRelay(chainId: string): boolean {
    return RELAYS.includes(chainId);
}

/**
 * Get the relay chainId for a given chain ID
 */
export function getRelayId(chainId: string): string {
    const relayId = RELAYS.find((relay) => chainId.startsWith(relay));
    if (!relayId) {
        throw new Error(`No relay found for chainID: ${chainId}`);
    }
    return relayId;
}
