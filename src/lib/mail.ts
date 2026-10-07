import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

// SMTP settings come from environment variables only. Works with a Hostinger mailbox or any SMTP service.
const host = process.env.SMTP_HOST;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const port = Number(process.env.SMTP_PORT) || 465;
const from = process.env.MAIL_FROM || user || '';

export const mailConfigured = Boolean(host && user && pass && from);

let transport: Transporter | null = null;

/** Sends a plain-text email. Returns false (and logs) on failure instead of throwing. */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!mailConfigured) {
    console.error('mail not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM); email not sent');
    return false;
  }
  try {
    transport ??= nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transport.sendMail({ from, to, subject, text });
    return true;
  } catch (err) {
    console.error('mail failed:', err);
    return false;
  }
}
