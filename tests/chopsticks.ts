import { exec as _exec } from "child_process";
import { promisify } from "util";

let chopsticks_launch_cmd = `
    npx @acala-network/chopsticks \
        --endpoint wss://polkadot-rpc.dwellir.com \
        --block 25895028
`;

const exec = promisify(_exec);
export async function launchChopsticks() {
    try {
        const { stdout, stderr } = await exec(chopsticks_launch_cmd);
        if (stderr) {
            console.error("Error:", stderr);
        }
        console.log("Output:", stdout);
    } catch (error) {
        console.error("Failed to launch Chopsticks:", error);
    }
}
