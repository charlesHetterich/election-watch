import { App, Observables } from "@lambdas/app-support";

export default App("", {
    watching: Observables.event.polkadot.Balances.Transfer,
    trigger: (tx, c) => {
        console.log("basic test trigger hit!");
        console.log(tx);
        return true;
    },
    lambda: async (tx, c) => {
        console.log("basic test lambda hit!");
        console.log(tx);
    },
});
