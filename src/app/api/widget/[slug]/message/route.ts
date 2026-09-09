import { NextResponse } from "next/server";
import { z } from "zod";
import { sendWidgetMessage } from "@/services/conversations/widget-message";
import { checkRateLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";

/**
 * The one public, unauthenticated API route in the app — everything
 * else requires a session (see src/services/conversations/widget-message.ts's
 * doc comment). Rate-limited by IP since there's no auth to key on.
 */
const bodySchema = z.object({
  conversationId: z.string().nullable().optional(),
  message: z.string().trim().min(1).max(2000),
});

const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`widget:${slug}:${ip}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many messages — please wait a moment and try again." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const result = await sendWidgetMessage(slug, parsed.data.conversationId ?? null, parsed.data.message);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[widget message]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
