import { createClient, TypedApi } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import path from "path";
import { ChainId } from "@lambdas/app-support";
import * as D from "@polkadot-api/descriptors";
import { AppsManager } from "@lambdas/app-handler";

export const appsDir = path.join(process.cwd(), "tests/mock-apps");

/**
 * mock of `AppsManager.getAPI`
 */
export async function mockGetAPI(
    this: AppsManager,
    chainId: ChainId
): Promise<TypedApi<any>> {
    if (this.apis[chainId]) {
        return this.apis[chainId];
    }

    const newClient = createClient(
        withPolkadotSdkCompat(getWsProvider(`ws://[::]:${8000}`))
    );

    const descriptor = D[chainId];
    this.apis[chainId] = newClient.getTypedApi(descriptor);
    return this.apis[chainId];
}
