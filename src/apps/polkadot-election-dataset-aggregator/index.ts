import { dot } from "@polkadot-api/descriptors";

import { Context } from "../../index";
import { aggData } from "./aggData";

export const watching = "event.ElectionProviderMultiPhase.PhaseTransitioned";

export const description = `
Once per day, aggregates election snapshots & results into a Huggingface Dataset. Each time this triggers we capture the current "snapshot" (today's sample) and "results" (yesterday's label).

Data is downloaded locally, uploaded to Huggingface, and then deleted from local.
`;

/**
 * Trigger when `Signed` phase begins. This should trigger once per era.
 */
export function trigger(
    transition: typeof dot.descriptors.pallets.__event.ElectionProviderMultiPhase.PhaseTransitioned._type,
    _context: Context<typeof dot>
): boolean {
    return transition.to.type == "Signed";
}

/**
 * Aggregate snapshot data
 */
export function lambda(
    _content: typeof dot.descriptors.pallets.__event.ElectionProviderMultiPhase.PhaseTransitioned._type,
    context: Context<typeof dot>
) {
    aggData(context.api);
}
