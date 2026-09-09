import { db } from "@/server/db/client";
import { NotFoundError, AppError } from "@/lib/errors";
import { runAgentTurn } from "@/services/ai/orchestrator";

/**
 * The one entry point real (unauthenticated) customers use — everything
 * else in the app requires a staff session. Deliberately not the same
 * function as logCustomerMessage (which checks `customers:manage` on an
 * authenticated actor): there's no actor here, only rate limiting
 * (src/app/api/widget/[slug]/message/route.ts) standing in for
 * authorization. `conversationId`, if supplied, is re-validated against
 * `businessSlug` and `isTest: false` — never trusted as authorization by
 * itself, same rule as everywhere else in the app (see docs/SECURITY.md).
 */
export async function sendWidgetMessage(
  businessSlug: string,
  conversationId: string | null,
  body: string,
) {
  const business = await db.business.findUnique({ where: { slug: businessSlug } });
  if (!business) {
    throw new NotFoundError("This chat isn't available.");
  }

  let conversation = conversationId
    ? await db.conversation.findFirst({
        where: { id: conversationId, businessId: business.id, isTest: false },
      })
    : null;

  if (!conversation) {
    const customer = await db.customer.create({
      data: { businessId: business.id, name: "Website visitor", source: "Website Widget" },
    });
    conversation = await db.conversation.create({
      data: { businessId: business.id, customerId: customer.id, status: "AI_HANDLING" },
    });
  }

  if (conversation.status === "RESOLVED") {
    throw new AppError("This conversation has been closed — refresh to start a new one.");
  }

  const message = await db.message.create({
    data: { conversationId: conversation.id, senderType: "CUSTOMER", body },
  });
  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  if (conversation.status === "AI_HANDLING") {
    try {
      await runAgentTurn({
        businessId: business.id,
        conversationId: conversation.id,
        triggerMessageId: message.id,
      });
    } catch {
      // Already logged and escalated inside runAgentTurn.
    }
  }

  const messages = await db.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  return { conversationId: conversation.id, messages };
}

export async function getWidgetBusinessInfo(businessSlug: string) {
  const business = await db.business.findUnique({
    where: { slug: businessSlug },
    include: { agents: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!business) return null;

  return {
    name: business.name,
    agentName: business.agents[0]?.name ?? "AI Assistant",
  };
}
