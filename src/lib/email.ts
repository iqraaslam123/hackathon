import nodemailer from "nodemailer";

const APP_NAME = process.env.APP_NAME || "Auth";

function isConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/**
 * Sends an email via Gmail SMTP when `GMAIL_USER` / `GMAIL_APP_PASSWORD` are
 * configured. Falls back to logging the message to the server console in
 * development mode (no real email is sent).
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!isConfigured()) {
    console.log(`[EMAIL] to=${options.to} subject=${options.subject}`);
    console.log(`[EMAIL BODY]\n${options.text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });

  await transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
}

export function emailServiceConfigured(): boolean {
  return isConfigured();
}
