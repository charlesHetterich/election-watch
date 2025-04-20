import { dot } from "@polkadot-api/descriptors";
import { sendEmail } from "./email";

export const watching = "event.ElectionProviderMultiPhase.PhaseTransitioned";

export const description = `
Listens for changes in npos election phases on the polkadot network and send an email to yourself, configured in the .env file.
`;

/**
 * Trigger for all phase transition events
 */
export function trigger(
    _data: typeof dot.descriptors.pallets.__event.ElectionProviderMultiPhase.PhaseTransitioned._type
): boolean {
    return true;
}

/**
 * Send phase transition data to email
 */
export function lambda(
    content: typeof dot.descriptors.pallets.__event.ElectionProviderMultiPhase.PhaseTransitioned._type
) {
    sendEmail("Election Phase Transitioned", content);
}
