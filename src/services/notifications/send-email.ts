import { env } from "@/lib/env";

/**
 * Real email delivery via Resend's REST API — plain fetch, no SDK
 * dependency, matching how the Ollama provider already talks to its
 * API directly (see src/services/ai/providers/ollama.ts).
 *
 * Never throws: this is called from the automation engine
 * (src/services/automations/run.ts), which has its own hard rule that
 * a notification failure must never break the real action (a lead
 * being created, a conversation being escalated, ...) that triggered
 * it. With no RESEND_API_KEY configured, this silently no-ops — the
 * in-app notification (the other half of NOTIFY_TEAM) still lands.
 */
export async function sendEmail(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!env.RESEND_API_KEY) {
    return { sent: false, error: "RESEND_API_KEY not configured — email skipped." };
  }
  if (params.to.length === 0) {
    return { sent: false, error: "No recipients." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { sent: false, error: `Resend ${response.status}: ${body.slice(0, 300)}` };
    }

    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
