import { dot } from "@polkadot-api/descriptors";
import { sendEmail } from "./email";

import { Context } from "../../index";

export const watching = "event.ElectionProviderMultiPhase.PhaseTransitioned";

export const description = `
Listens for changes in npos election phases on the polkadot network and send a self-email (configured in .env) with the raw transition data JSON.
`;

/**
 * Trigger for all phase transition events
 */
export function trigger(
    _data: typeof dot.descriptors.pallets.__event.ElectionProviderMultiPhase.PhaseTransitioned._type,
    _context: Context<typeof dot>
): boolean {
    return true;
}

/**
 * Send phase transition data to email
 */
export function lambda(
    content: typeof dot.descriptors.pallets.__event.ElectionProviderMultiPhase.PhaseTransitioned._type,
    _context: Context<typeof dot>
) {
    sendEmail("Election Phase Transitioned", content);
}
