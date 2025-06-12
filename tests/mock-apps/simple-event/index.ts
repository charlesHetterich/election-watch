import { App, Observables } from "@lambdas/app-support";

export default App("", {
    watching: Observables.event.polkadot.Balances.Transfer(),
    trigger: (_, c) => true,
    lambda: async (_, c) => {},
});
