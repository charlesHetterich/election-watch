import { App, Observables } from "@lambdas/app-support";
import { getSigner } from "../../helpers";

export default App(
    [],
    /**
     * Simply watch the current block number of the Polkadot relay chain.
     * This should trigger once per block.
     */
    {
        watching: Observables.storage.polkadot.System.Number(),
        trigger: (_, c) => true,
        lambda: async (_, c) => {},
    },

    /**
     * Watch the system account of Bob. This should update everytime
     * Bob submits an extrinsic or receives funds.
     */
    {
        watching: Observables.storage.polkadot.System.Account(
            getSigner("Bob").address
        ),
        trigger: (_, c) => true,
        lambda: async (_, c) => {
            console.log("bob here!", _);
        },
    },

    /**
     * Watch the balance of an address where nothing ever changes
     * (this should trigger once on launch and then never again)
     */
    {
        watching: Observables.storage.polkadot.System.Account(
            getSigner("NothingEverHappensHere").address
        ),
        trigger: (_, c) => true,
        lambda: async (_, c) => {},
    }
);
