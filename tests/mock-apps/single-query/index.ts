import { App, Observables } from "@lambdas/app-support";

export default App("", {
    watching:
        Observables.event.polkadot.ElectionProviderMultiPhase.PhaseTransitioned(),

    trigger: (_, c) => {
        console.log("basic test trigger hit!");
        return true;
    },
    lambda: async (_, c) => {
        console.log("basic test lambda hit!!");
    },
});
