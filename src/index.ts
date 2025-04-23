import { loadApps } from "./app-support";
import { SUBSTRATE_LAMBDAS } from "./titles";

async function main() {
    console.log(SUBSTRATE_LAMBDAS);
    (await loadApps()).launch();
}

main().catch((error) => console.error("Error:", error));
