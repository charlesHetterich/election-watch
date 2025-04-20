import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";

function saveJSON(data: any, path: string) {
    fs.writeFileSync(
        path,
        typeof data === "object" && data !== null
            ? JSON.stringify(
                  data,
                  (key, value) =>
                      typeof value === "bigint" ? value.toString() : value,
                  2
              )
            : String(data)
    );
}

function saveEraData(era: number, fn: string, data: any) {
    const outDir = `./out/era_${era}/`;
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    saveJSON(data, path.join(outDir, `${fn}.json`));
}

function cleanUp() {
    const outDir = `./out/`;
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
}

export async function aggData(api: TypedApi<typeof dot>) {
    console.log("[1] capturing data...");
    const currentEra =
        (await api.query.Staking.ActiveEra.getValue())?.index ?? 0;

    const sample =
        await api.query.ElectionProviderMultiPhase.Snapshot.getValue();
    const label = await api.query.Staking.ErasStakersPaged.getEntries(
        currentEra
    );

    console.log("[2] saving data...");
    saveEraData(currentEra, "sample", sample);
    saveEraData(currentEra - 1, "label", label);

    console.log("[3] uploading data...");
    const command = `python ${__dirname}/pushData.py ./out "[lambda] publish era ${currentEra}"`;
    try {
        const output = execSync(command, { stdio: "inherit" });
        console.log("Command executed successfully:", command);
    } catch (error) {
        console.error("Error executing command:", error);
    }

    console.log("[4] cleaning up local data...");
    cleanUp();
}
