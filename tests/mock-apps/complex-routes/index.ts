import { App, Observables } from "@lambdas/app-support";
import { getSigner } from "../../helpers";
import { encodeAddress } from "@polkadot/keyring";

export default App(
    [],
    /**
     * Watch all events on the `System` pallet on the polkadot chain
     */
    {
        watching: Observables.event.polkadot.Balances.all(),
        trigger: (_, c) => true,
        lambda: async (_, c) => {},
    },

    /**
     * Watch all events across pallets on the polkadot chain
     */
    {
        watching: Observables.event.polkadot.all(),
        trigger: (_, c) => true,
        lambda: async (_, c) => {},
    },

    /**
     * Watch for transfer events, and only trigger the
     * lambda when the transfers are from Alice, and
     * above a certain threshold
     */
    {
        watching: Observables.event.polkadot.Balances.Transfer(),
        trigger: (transfer, c) => {
            return (
                transfer.from ==
                    encodeAddress(getSigner("Alice").signer.publicKey, 0) &&
                transfer.amount > 20_000_000_000n
            );
        },
        lambda: async (_, c) => {},
    }
);
