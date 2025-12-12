import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: any = null;

export async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST;
  const port = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : undefined;
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;

  if (host && port && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  } else {
    // Create a test account and transporter when no env mail config provided
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
  }

  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; text?: string; html?: string; from?: string }) {
  const tx = await getTransporter();
  const from = opts.from || process.env.MAIL_FROM || 'no-reply@example.com';
  const info = await tx.sendMail({ from, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html });

  // Compute preview URL for Ethereal test account if available
  let previewUrl: string | null = null;
  try {
    if ((info as any).messageId && (nodemailer as any).getTestMessageUrl) {
      const url = (nodemailer as any).getTestMessageUrl(info);
      previewUrl = url || null;
    }
  } catch (e) {
    // ignore
  }

  if (previewUrl) console.log('Mail preview URL:', previewUrl);

  return { info, previewUrl };
}
