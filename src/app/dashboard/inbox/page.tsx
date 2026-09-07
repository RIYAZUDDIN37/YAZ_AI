import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { ConversationList } from "./conversation-list";
import { ConversationThread } from "./conversation-thread";
import { ContextPanel } from "./context-panel";
import { EmptyInboxState } from "./empty-inbox-state";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const { c: selectedId } = await searchParams;

  const [conversations, customers] = await Promise.all([
    db.conversation.findMany({
      where: { businessId: business.id },
      orderBy: { lastMessageAt: "desc" },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.customer.findMany({
      where: { businessId: business.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeId = selectedId ?? conversations[0]?.id;
  const active = activeId
    ? await db.conversation.findFirst({
        where: { id: activeId, businessId: business.id },
        include: {
          customer: true,
          assignedTo: true,
          messages: {
            orderBy: { createdAt: "asc" },
            include: { senderUser: true },
          },
        },
      })
    : null;

  const activeLeads = active?.customerId
    ? await db.lead.findMany({
        where: { customerId: active.customerId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_300px]">
      <ConversationList
        conversations={conversations}
        activeId={active?.id}
        customers={customers}
      />

      {active ? (
        <>
          <ConversationThread conversation={active} />
          <div className="hidden lg:block">
            <ContextPanel conversation={active} leads={activeLeads} />
          </div>
        </>
      ) : (
        <div className="col-span-full flex items-center justify-center md:col-span-1 lg:col-span-2">
          <EmptyInboxState hasCustomers={customers.length > 0} />
        </div>
      )}
    </div>
  );
}
