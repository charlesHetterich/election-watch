import path from "path";
import { AppsManager, loadApps } from "./app-handler";
import { SUBSTRATE_LAMBDAS } from "./titles";

const appsDir = path.join(process.cwd(), "src/apps");

async function main() {
    console.log(SUBSTRATE_LAMBDAS);

    // Load & launch all apps
    const manager = new AppsManager();
    await loadApps(appsDir, manager);
    await manager.launch();
}

main().catch((error) => console.error("Error:", error));
