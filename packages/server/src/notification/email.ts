import 'server-only';

import nodemailer from 'nodemailer';

export type Email = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Sends one email over SMTP, from EMAIL_FROM. Locally, EMAIL_SMTP_* point at
 * the Supabase stack's mail catcher (Mailpit), the same inbox Auth's emails
 * land in; in production, at Resend's SMTP relay on Lectern's own domain.
 * EMAIL_SMTP_USER and EMAIL_SMTP_PASSWORD are only needed where the server
 * asks for them.
 */
export async function sendEmail(email: Email): Promise<void> {
  const host = process.env.EMAIL_SMTP_HOST;
  const port = Number(process.env.EMAIL_SMTP_PORT);
  const from = process.env.EMAIL_FROM;
  if (!host || !port || !from) {
    throw new Error(
      'Email is not configured: set EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, and EMAIL_FROM.',
    );
  }

  const user = process.env.EMAIL_SMTP_USER;
  const password = process.env.EMAIL_SMTP_PASSWORD;
  const transport = nodemailer.createTransport({
    host,
    port,
    // 465 is SMTP over TLS from the first byte; other ports upgrade if offered.
    secure: port === 465,
    auth: user && password ? { user, pass: password } : undefined,
  });

  await transport.sendMail({ from, ...email });
}
