import nodemailer from 'nodemailer';

// `dot` is the name we gave to `npx papi add`
import { dot } from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot";
import { start } from "polkadot-api/smoldot";
import dotenv from 'dotenv';

dotenv.config();

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

if (!EMAIL || !PASSWORD) {
    throw new Error('EMAIL and PASSWORD must be set in the .env file');
}

const smoldot = start();
const chain = await smoldot.addChain({ chainSpec });

// Connect to the polkadot relay chain.
const client = createClient(
    getSmProvider(chain)
);

// With the `client`, you can get information such as subscribing to the last
// block to get the latest hash:

// To interact with the chain, you need to get the `TypedApi`, which includes
// all the types for every call in that chain:
const dotApi = client.getTypedApi(dot)


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL,
        pass: PASSWORD,
    },
});

function emailData(data: any) {
    const dataString = typeof data === 'object' && data !== null
        ? JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2
        )
        : String(data);

    const mailOptions = {
        from: EMAIL,
        to: EMAIL,
        subject: 'Test Email',
        text: dataString,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

dotApi.event.ElectionProviderMultiPhase.PhaseTransitioned.watch((data) => true)
    .forEach(emailData)

// dotApi.event.NominationPools.Bonded.watch((data) => true)
//     .forEach(emailData)