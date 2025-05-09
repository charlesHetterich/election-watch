import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot"; // Can select other chains (kusama, westend, etc. here)
import { start } from "polkadot-api/smoldot";

import { loadApps } from "./app-handler";
import { SUBSTRATE_LAMBDAS } from "./titles";

async function main() {
    console.log(SUBSTRATE_LAMBDAS);

    // Start light client
    const smoldot = start();
    const chain = await smoldot.addChain({ chainSpec });
    const client = createClient(getSmProvider(chain));

    // Load & launch all apps
    (await loadApps(client)).launch();
}

main().catch((error) => console.error("Error:", error));
