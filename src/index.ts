import path from "path";
import { AppsManager } from "./app-handler";
import { SUBSTRATE_LAMBDAS } from "./titles";

const appsDir = path.join(process.cwd(), "src/apps");

async function main() {
    console.log(SUBSTRATE_LAMBDAS);
    new AppsManager().startApps(appsDir);
}

main().catch((error) => console.error("Error:", error));
