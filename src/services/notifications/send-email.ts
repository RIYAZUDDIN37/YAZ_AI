import nodemailer from "nodemailer";
import { env } from "@/lib/env";

/**
 * Real email delivery via SMTP — deliberately not a paid transactional
 * API (Resend, SendGrid, ...): those all require a verified custom
 * domain before they'll send to anyone but the account owner on their
 * free tier. SMTP through a free Gmail account (+ an App Password, not
 * the account password) needs no domain at all and sends to real
 * recipients immediately.
 *
 * Never throws: this is called from the automation engine
 * (src/services/automations/run.ts), which has its own hard rule that
 * a notification failure must never break the real action (a lead
 * being created, a conversation being escalated, ...) that triggered
 * it. With SMTP not configured, this silently no-ops — the in-app
 * notification (the other half of NOTIFY_TEAM) still lands.
 */

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return cachedTransporter;
}

export async function sendEmail(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false, error: "SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — email skipped." };
  }
  if (params.to.length === 0) {
    return { sent: false, error: "No recipients." };
  }

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
