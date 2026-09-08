"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { updateAgentProfile } from "@/services/agents/update-profile";
import { createAgentRule, toggleAgentRule, deleteAgentRule } from "@/services/agents/rules";
import { createAgentGoal, toggleAgentGoal, deleteAgentGoal } from "@/services/agents/goals";
import { createKnowledgeDocument } from "@/services/knowledge/create-document";
import { deleteKnowledgeDocument } from "@/services/knowledge/delete-document";
import { sendTestMessage, resetTestConversation } from "@/services/agents/test-simulator";
import {
  updateAgentProfileSchema,
  createAgentRuleSchema,
  toggleAgentRuleSchema,
  deleteAgentRuleSchema,
  createAgentGoalSchema,
  toggleAgentGoalSchema,
  deleteAgentGoalSchema,
  sendTestMessageSchema,
  type UpdateAgentProfileInput,
  type CreateAgentRuleInput,
  type ToggleAgentRuleInput,
  type DeleteAgentRuleInput,
  type CreateAgentGoalInput,
  type ToggleAgentGoalInput,
  type DeleteAgentGoalInput,
  type SendTestMessageInput,
} from "@/lib/validation/agent-config";
import {
  createKnowledgeDocumentSchema,
  deleteKnowledgeDocumentSchema,
  type CreateKnowledgeDocumentInput,
  type DeleteKnowledgeDocumentInput,
} from "@/lib/validation/knowledge";
import { toActionError } from "@/lib/handle-error";

const PATH = "/dashboard/agent";

async function currentContext() {
  const { session, membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  const agent = await db.aIAgent.findFirst({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  });
  if (!agent) redirect("/onboarding");
  return { session, membership, business, agent };
}

export async function updateAgentProfileAction(
  input: UpdateAgentProfileInput,
): Promise<{ error?: string }> {
  const parsed = updateAgentProfileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business, agent } = await currentContext();
  try {
    await updateAgentProfile(business.id, membership.role, agent.id, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function createAgentRuleAction(
  input: CreateAgentRuleInput,
): Promise<{ error?: string }> {
  const parsed = createAgentRuleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business, agent } = await currentContext();
  try {
    await createAgentRule(business.id, membership.role, agent.id, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleAgentRuleAction(
  input: ToggleAgentRuleInput,
): Promise<{ error?: string }> {
  const parsed = toggleAgentRuleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentContext();
  try {
    await toggleAgentRule(business.id, membership.role, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAgentRuleAction(
  input: DeleteAgentRuleInput,
): Promise<{ error?: string }> {
  const parsed = deleteAgentRuleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentContext();
  try {
    await deleteAgentRule(business.id, membership.role, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function createAgentGoalAction(
  input: CreateAgentGoalInput,
): Promise<{ error?: string }> {
  const parsed = createAgentGoalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business, agent } = await currentContext();
  try {
    await createAgentGoal(business.id, membership.role, agent.id, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleAgentGoalAction(
  input: ToggleAgentGoalInput,
): Promise<{ error?: string }> {
  const parsed = toggleAgentGoalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentContext();
  try {
    await toggleAgentGoal(business.id, membership.role, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAgentGoalAction(
  input: DeleteAgentGoalInput,
): Promise<{ error?: string }> {
  const parsed = deleteAgentGoalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentContext();
  try {
    await deleteAgentGoal(business.id, membership.role, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function createKnowledgeDocumentAction(
  input: CreateKnowledgeDocumentInput,
): Promise<{ error?: string }> {
  const parsed = createKnowledgeDocumentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentContext();
  try {
    await createKnowledgeDocument(business.id, membership.role, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteKnowledgeDocumentAction(
  input: DeleteKnowledgeDocumentInput,
): Promise<{ error?: string }> {
  const parsed = deleteKnowledgeDocumentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentContext();
  try {
    await deleteKnowledgeDocument(business.id, membership.role, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function sendTestMessageAction(
  input: SendTestMessageInput,
): Promise<{ error?: string }> {
  const parsed = sendTestMessageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { session, membership, business } = await currentContext();
  try {
    await sendTestMessage(business.id, session.user.id, membership.role, parsed.data);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetTestConversationAction(): Promise<{ error?: string }> {
  const { membership, business } = await currentContext();
  try {
    await resetTestConversation(business.id, membership.role);
    revalidatePath(PATH);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
