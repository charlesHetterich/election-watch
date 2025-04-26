import { dot } from "@polkadot-api/descriptors";
import { Context, Observables, Payload } from "@lambdas/app-support";
import { aggData } from "./aggData";

export const watching =
    Observables.event.ElectionProviderMultiPhase.PhaseTransitioned;
export const description = `
Once per day, aggregates election snapshots & results into a Huggingface Dataset. Each time this triggers we capture the current "snapshot" (today's sample) and "results" (yesterday's label).

Data is downloaded locally, uploaded to Huggingface, and then deleted from local.
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
 * Aggregate snapshot data
 */
export function lambda(
    _: Payload<typeof watching>,
    context: Context<typeof dot>
) {
    aggData(context.api);
}
