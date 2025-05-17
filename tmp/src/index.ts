import { Keyring } from "@polkadot/api";
import { dot, MultiAddress } from "@polkadot-api/descriptors";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { createClient, PolkadotClient } from "polkadot-api";
import { getPolkadotSigner } from "polkadot-api/signer";
import { getWsProvider } from "polkadot-api/ws-provider/web";

const MOCK_PORT = 8000;

function getNewSigner(seed: string = "Alice") {
    const keyring = new Keyring({ type: "sr25519" });
    const pair = keyring.addFromUri(`//${seed}`, {}, "sr25519");
    return {
        address: pair.address,
        signer: getPolkadotSigner(
            pair.publicKey,
            "Sr25519",
            (data: Uint8Array) => pair.sign(data)
        ),
    };
}

function getClient(uri: string): PolkadotClient {
    const client = createClient(withPolkadotSdkCompat(getWsProvider(uri)));
    return client;
}

async function main() {
    const [, , ...args] = process.argv;
    const mode: "mock" | "actual" = args[0] === "mock" ? "mock" : "actual";

    // Connect to mock or real client & get API
    const client = getClient(
        mode == "mock"
            ? `ws://[::]:${MOCK_PORT}`
            : "wss://polkadot-rpc.dwellir.com"
    );
    const papi = client.getTypedApi(dot);

    // Start listening to transfer events. Checking both `.forEach` and `.subscribe`.
    papi.event.Balances.Transfer.watch().forEach((ev) => {
        console.log("--- HIT THE `.forEach` WE WANT ---");
        console.log(ev.meta);
        console.log(ev.payload);
        console.log("----------------------------------");
    });
    papi.event.Balances.Transfer.watch().subscribe((ev) => {
        console.log("--- HIT THE `.subscribe` WE WANT ---");
        console.log(ev.meta);
        console.log(ev.payload);
        console.log("------------------------------------");
    });

    // (wait 1 second just to rule out timing issues on mock test)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Waiting for events...");

    // If mock, submit a transfer extrinsic
    // If actual, just wait a few seconds and an event should pop up soon...
    if (mode == "mock") {
        // Get addresses & submit a valid transfer extrinsic
        const alice = getNewSigner();
        const bob = getNewSigner("Bob");
        papi.tx.Balances.transfer_allow_death({
            dest: MultiAddress.Id(bob.address),
            value: 1000n,
        })
            .signSubmitAndWatch(alice.signer)
            // This one seems to always hit.
            //
            // Track the state of the submitted extrinsic just to
            // verify it actually worked on the chopsticks side
            .subscribe({
                next: (e) => {
                    console.log(e.type);
                    if (e.type == "finalized") {
                        console.log(
                            "`.forEach` & `.subscribe` both should have hit by now"
                        );
                    }
                },
                error: console.error,
                complete() {
                    console.log("done");
                },
            });
    }
}

main().catch((error) => console.error("Error:", error));
