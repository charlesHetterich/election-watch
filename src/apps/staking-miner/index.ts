import { App, Observables, workers } from "@lambdas/app-support";

const description = `
Once per day when the \`Signed\` phase of the npos election cycle begins, spin up a *vast.ai* worker to calculate & submit an election solution using a parameterized reinforcement learning model.

The worker is destroyed when a \`SolutionStored\` event is emitted with self as the origin
`;

export default App(description, {
    /**
     * Triggers when `Signed` phase begins. This should trigger once per era.
     */
    watching: Observables.event.ElectionProviderMultiPhase.PhaseTransitioned,
    trigger: (_, c) => {
        return true;
    },

    /**
     * Run dummy GPU task & shut it down 10 seconds later
     */
    lambda: async (_, c) => {
        console.log("TESTING VAST LAUNCH");
        const machineId = await workers.vast.tryLaunch({
            gpu_name: "RTX_3070",
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
    },
});
