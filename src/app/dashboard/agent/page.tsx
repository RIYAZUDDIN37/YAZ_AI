import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { can } from "@/server/authorization/permissions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getActiveTestConversation } from "@/services/agents/test-simulator";
import { ProfileForm } from "./profile-form";
import { RulesPanel } from "./rules-panel";
import { GoalsPanel } from "./goals-panel";
import { KnowledgePanel } from "./knowledge-panel";
import { TestPanel } from "./test-panel";

export const metadata: Metadata = { title: "Train AI Employee" };

export default async function AgentTrainingPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  // Training config is business:manage territory (STAFF handles
  // conversations, not the AI's configuration) — quietly send them back
  // rather than showing a raw error for a page there's no nav link to.
  if (!can(membership.role, "business:manage")) {
    redirect("/dashboard");
  }

  const [agent, documents, testConversation] = await Promise.all([
    db.aIAgent.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
      include: {
        rules: { orderBy: { order: "asc" } },
        goals: { orderBy: { order: "asc" } },
      },
    }),
    db.knowledgeDocument.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    }),
    getActiveTestConversation(business.id),
  ]);

  if (!agent) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Train {agent.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your AI employee&apos;s personality, rules, goals, and knowledge — then test it
          before it talks to real customers.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileForm agent={agent} />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <RulesPanel rules={agent.rules} />
        </TabsContent>

        <TabsContent value="goals" className="mt-4">
          <GoalsPanel goals={agent.goals} />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <KnowledgePanel documents={documents} />
        </TabsContent>

        <TabsContent value="test" className="mt-4">
          <TestPanel agentName={agent.name} conversation={testConversation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
