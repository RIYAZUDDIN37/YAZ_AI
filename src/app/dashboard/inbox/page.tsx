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

  const [conversations, customers, agent] = await Promise.all([
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
    db.aIAgent.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
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

  const [activeLeads, activeExecutions] = active
    ? await Promise.all([
        active.customerId
          ? db.lead.findMany({
              where: { customerId: active.customerId },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
        db.agentExecution.findMany({
          where: { conversationId: active.id },
          orderBy: { createdAt: "desc" },
          include: { actions: true },
        }),
      ])
    : [[], []];

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_300px]">
      <ConversationList
        conversations={conversations}
        activeId={active?.id}
        customers={customers}
      />

      {active ? (
        <>
          <ConversationThread conversation={active} agentName={agent?.name ?? "AI"} />
          <div className="hidden lg:block">
            <ContextPanel conversation={active} leads={activeLeads} executions={activeExecutions} />
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
