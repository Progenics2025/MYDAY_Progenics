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

  console.log('[MAILER] Configuration check:', { host, port, user: user ? '***set***' : 'NOT SET', pass: pass ? '***set***' : 'NOT SET' });

  if (host && port && user && pass) {
    console.log('[MAILER] Using configured SMTP server:', host, port);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  } else {
    // Create a test account and transporter when no env mail config provided
    console.log('[MAILER] WARNING: Using Ethereal test account (emails will NOT be delivered!)');
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
  console.log('[MAILER] Sending email to:', opts.to, 'Subject:', opts.subject);

  try {
    const tx = await getTransporter();
    const from = opts.from || process.env.MAIL_FROM || 'no-reply@example.com';
    console.log('[MAILER] From:', from);

    const info = await tx.sendMail({ from, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html });
    console.log('[MAILER] ✅ Email sent successfully! MessageId:', info.messageId);

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

    if (previewUrl) console.log('[MAILER] Preview URL:', previewUrl);

    return { info, previewUrl };
  } catch (error: any) {
    console.error('[MAILER] ❌ Failed to send email:', error.message || error);
    console.error('[MAILER] Error details:', error);
    throw error;
  }
}
