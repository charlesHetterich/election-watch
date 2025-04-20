import nodemailer from "nodemailer";
import { dot } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot";
import { start } from "polkadot-api/smoldot";
import dotenv from "dotenv";

import { SUBSTRATE_EVENT_LAMBDAS } from "./titles";

console.log(SUBSTRATE_EVENT_LAMBDAS);

// setup gmail access
dotenv.config();
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
if (!EMAIL || !PASSWORD) {
  throw new Error("EMAIL and PASSWORD must be set in the .env file");
}
const gmailAcc = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL,
    pass: PASSWORD,
  },
});

/**
 * Sends data to the specified email address.
 *
 * @param {any} content - The content to be sent in the email.
 * @returns {void}
 */
function sendToEmail(content: any) {
  const dataString =
    typeof content === "object" && content !== null
      ? JSON.stringify(
          content,
          (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          2
        )
      : String(content);

  const mailOptions = {
    from: EMAIL,
    to: EMAIL,
    subject: "DELIVERY HONK",
    text: dataString,
  };

  gmailAcc.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

async function main() {
  // setup PAPI
  const smoldot = start();
  const chain = await smoldot.addChain({ chainSpec });
  const client = createClient(getSmProvider(chain));
  const papi = client.getTypedApi(dot);

  // listen for phase transitions
  papi.event.ElectionProviderMultiPhase.PhaseTransitioned.watch(
    (data) => true
  ).forEach(sendToEmail);
}

main()
  .then(() => {
    console.log("Listening for events...");
  })
  .catch((error) => {
    console.error("Error:", error);
  });
