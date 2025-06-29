import path from "path";
import { AppsManager, startApps } from "./app-handler";
import { SUBSTRATE_LAMBDAS } from "./titles";

const appsDir = path.join(process.cwd(), "src/apps");

async function main() {
    console.log(SUBSTRATE_LAMBDAS);

    // Load & launch all apps
    const manager = new AppsManager();
    await startApps(appsDir, manager);
}

main().catch((error) => console.error("Error:", error));
