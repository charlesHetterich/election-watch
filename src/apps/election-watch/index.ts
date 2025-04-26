import { dot } from "@polkadot-api/descriptors";
import { Context, Payload, Observables } from "@lambdas/app-support";
import { sendEmail } from "./email";

export const watching =
    Observables.event.ElectionProviderMultiPhase.PhaseTransitioned;
export const description = `
Listens for changes in npos election phases on the polkadot network and send a self-email (configured in .env) with the raw transition data JSON.
`;

/**
 * Trigger for all phase transition events
 */
export function trigger(
    _: Payload<typeof watching>,
    __: Context<typeof dot>
): boolean {
    return true;
}

/**
 * Send phase transition data to email
 */
export function lambda(
    content: Payload<typeof watching>,
    _: Context<typeof dot>
) {
    sendEmail("Election Phase Transitioned", content);
}
