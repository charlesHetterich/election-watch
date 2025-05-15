import { App, Observables } from "@lambdas/app-support";
import { sendEmail } from "./email";

const description = `
Listens for changes in npos election phases on the polkadot network and send a self-email (configured in .env) with the raw transition data JSON.
`;

export default App(description, {
    /**
     * Triggers for all phase transition events
     */
    watching:
        Observables.event.polkadot.ElectionProviderMultiPhase.PhaseTransitioned,
    trigger: (_, c) => {
        return true;
    },

    /**
     * Send phase transition data to email
     */
    lambda: (transition, c) => {
        sendEmail("Election Phase Transitioned", transition);
    },
});
