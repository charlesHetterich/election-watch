import nodemailer from "nodemailer";
import dotenv from "dotenv";

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

export function sendEmail(subject: string, content: any) {
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
        subject,
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
