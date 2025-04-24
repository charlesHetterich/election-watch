// vast.ts
import { exec as _exec } from "child_process";
import { promisify } from "util";
const exec = promisify(_exec);

export interface TryLaunchParams {
    gpu_name?: string;
    reliability?: number;
    num_gpus?: number;
    min_ram_gb?: number;
    max_usd_per_hr?: number;
}

export async function tryLaunch(
    params: TryLaunchParams = {}
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
        return result as string | null;
    } catch (err: any) {
        // only throw if python really errored
        throw new Error(`vast.py error: ${err.stderr ?? err.message}`);
    }
}

export async function destroyInstance(machineId: string): Promise<boolean> {
    const cmd = `python ${__dirname}/api.py destroy ${machineId}`;
    try {
        // if the script exits non-zero, this will reject
        const { stdout, stderr } = await exec(cmd);
        console.log(stderr);
        const { result } = JSON.parse(stdout);
        return result as any;
    } catch (err: any) {
        // only throw if python really errored
        throw new Error(`vast.py error: ${err.stderr ?? err.message}`);
    }
}
