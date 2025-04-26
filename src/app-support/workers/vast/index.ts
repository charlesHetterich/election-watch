// vast.ts
import { exec as _exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";

// replicate __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const exec = promisify(_exec);

export interface TryLaunchParams {
    gpu_name?: string;
    reliability?: number;
    num_gpus?: number;
    min_ram_gb?: number;
    max_usd_per_hr?: number;
}

export async function tryLaunch(
    params: TryLaunchParams = {},
    nRetries: number = 5
): Promise<string | null> {
    const args = [
        "try_launch",
        "--gpu_name",
        params.gpu_name ?? "RTX_3090",
        "--reliability",
        String(params.reliability ?? 0.99),
        "--num_gpus",
        String(params.num_gpus ?? 1),
        "--min_ram_gb",
        String(params.min_ram_gb ?? 8),
        "--max_usd_per_hr",
        String(params.max_usd_per_hr ?? 1.0),
    ];

    const cmd = `python ${__dirname}/api.py ${args.join(" ")}`;
    try {
        // if the script exits non-zero, this will reject
        const { stdout, stderr } = await exec(cmd);
        console.log(stderr);
        const { result } = JSON.parse(stdout);
        if (result == null && nRetries > 0) {
            console.log(`Retrying LAUNCH on ${params}`);
            await new Promise((resolve) => setTimeout(resolve, 10000));
            return tryLaunch(params, nRetries - 1);
        }
        return result;
    } catch (err: any) {
        console.error(err);
        if (nRetries > 0) {
            console.log(`Retrying LAUNCH on ${params}`);
            await new Promise((resolve) => setTimeout(resolve, 10000));
            return tryLaunch(params, nRetries - 1);
        }
        return null;
    }
}

export async function destroyInstance(
    machineId: string,
    nRetries: number = 5
): Promise<boolean> {
    const cmd = `vastai destroy instance ${machineId}`;
    const { stdout, stderr } = await exec(cmd);
    console.log(stdout);
    console.log(stderr);

    if (stdout.trim() == `destroying instance ${machineId}.`) {
        return true;
    } else if (nRetries > 0) {
        console.log(`Retrying DESTROY on ${machineId}`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return destroyInstance(machineId, nRetries - 1);
    }
    return false;
}
