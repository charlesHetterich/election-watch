import { createClient, PolkadotClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import path from "path";

export const appsDir = path.join(process.cwd(), "tests/mock-apps");

export async function mockClient(): Promise<PolkadotClient> {
    const client = createClient(
        withPolkadotSdkCompat(getWsProvider("ws://[::]:8000"))
    );
    return client;
}
