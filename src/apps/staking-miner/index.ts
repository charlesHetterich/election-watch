import { dot } from "@polkadot-api/descriptors";
import { Context, Payload } from "@lambdas/app-support";
import { workers } from "@lambdas/app-support";
// import { aggData } from "./aggData";

export const watching = "event.ElectionProviderMultiPhase.PhaseTransitioned";
export const description = `
Once per day when the \`Signed\` phase of the npos election cycle begins, spin up a *vast.ai* worker to calculate & submit an election solution using a parameterized reinforcement learning model.

The worker is destroyed when a \`SolutionStored\` event is emitted with self as the origin
`;

/**
 * Triggers when `Signed` phase begins. This should trigger once per era.
 */
export function trigger(
    transition: Payload<typeof watching>,
    _: Context<typeof dot>
): boolean {
    return transition.to.type == "Signed";
}

/**
 * Run dummy GPU task & shut it down 10 seconds later
 */
export async function lambda(
    _: Payload<typeof watching>,
    _c: Context<typeof dot>
) {
    console.log("TESTING VAST LAUNCH");
    const machineId = await workers.vast.tryLaunch({
        gpu_name: "RTX_3090",
        reliability: 0.99,
        num_gpus: 1,
        min_ram_gb: 8,
        max_usd_per_hr: 1.0,
    });
    // const machineId = "10";
    console.log("Machine ID:", machineId);
    if (machineId) {
        console.log("Destroying machine in 10 seconds...");
        setTimeout(async () => {
            const destroyed = await workers.vast.destroyInstance(machineId);
            console.log("Machine destroyed:", destroyed);
        }, 10000);
    }
}
