import { dot } from "@polkadot-api/descriptors";
import { Context, Events, Payload } from "../../app-support";
import { sendEmail } from "./email";

export const watching = "event.ElectionProviderMultiPhase.PhaseTransitioned";
export const description = `
Listens for changes in npos election phases on the polkadot network and send a self-email (configured in .env) with the raw transition data JSON.
`;

/**
 * Trigger for all phase transition events
 */
export function trigger(
    _data: Payload<Events, typeof watching>,
    _context: Context<typeof dot>
): boolean {
    return true;
}

/**
 * Send phase transition data to email
 */
export function lambda(
    content: Payload<Events, typeof watching>,
    _context: Context<typeof dot>
) {
    sendEmail("Election Phase Transitioned", content);
}
