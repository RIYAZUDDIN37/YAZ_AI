"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { startConversation } from "@/services/conversations/start-conversation";
import { sendMessage } from "@/services/conversations/send-message";
import { logCustomerMessage } from "@/services/conversations/log-customer-message";
import { updateConversationStatus } from "@/services/conversations/update-status";
import {
  startConversationSchema,
  sendMessageSchema,
  updateConversationStatusSchema,
  type StartConversationInput,
  type SendMessageInput,
  type UpdateConversationStatusInput,
} from "@/lib/validation/conversations";
import { toActionError } from "@/lib/handle-error";

async function currentBusiness() {
  const { session, membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { session, membership, business };
}

export async function startConversationAction(
  input: StartConversationInput,
): Promise<{ error?: string; conversationId?: string }> {
  const parsed = startConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { session, membership, business } = await currentBusiness();

  try {
    const conversation = await startConversation(
      business.id,
      session.user.id,
      membership.role,
      parsed.data,
    );
    revalidatePath("/dashboard/inbox");
    return { conversationId: conversation.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function sendMessageAction(
  input: SendMessageInput,
): Promise<{ error?: string }> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { session, membership, business } = await currentBusiness();

  try {
    await sendMessage(business.id, session.user.id, membership.role, parsed.data);
    revalidatePath("/dashboard/inbox");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function logCustomerMessageAction(
  input: SendMessageInput,
): Promise<{ error?: string }> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { membership, business } = await currentBusiness();

  try {
    await logCustomerMessage(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/inbox");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateConversationStatusAction(
  input: UpdateConversationStatusInput,
): Promise<{ error?: string }> {
  const parsed = updateConversationStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { session, membership, business } = await currentBusiness();

  try {
    await updateConversationStatus(
      business.id,
      session.user.id,
      membership.role,
      parsed.data,
    );
    revalidatePath("/dashboard/inbox");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
