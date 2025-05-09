import { dot } from "@polkadot-api/descriptors";
import { createClient, PolkadotClient, TypedApi } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { launchChopsticks } from "./chopsticks";

// await launchChopsticks();

export async function mockClient(): Promise<PolkadotClient> {
    const client = createClient(
        withPolkadotSdkCompat(getWsProvider("ws://[::]:8000"))
    );
    return client;
}
