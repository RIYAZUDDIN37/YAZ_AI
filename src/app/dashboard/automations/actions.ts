"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { createAutomation } from "@/services/automations/create-automation";
import { toggleAutomation } from "@/services/automations/toggle-automation";
import { deleteAutomation } from "@/services/automations/delete-automation";
import {
  createAutomationSchema,
  toggleAutomationSchema,
  deleteAutomationSchema,
  type CreateAutomationInput,
  type ToggleAutomationInput,
  type DeleteAutomationInput,
} from "@/lib/validation/automations";
import { toActionError } from "@/lib/handle-error";

async function currentBusiness() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { membership, business };
}

export async function createAutomationAction(
  input: CreateAutomationInput,
): Promise<{ error?: string }> {
  const parsed = createAutomationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await createAutomation(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/automations");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleAutomationAction(
  input: ToggleAutomationInput,
): Promise<{ error?: string }> {
  const parsed = toggleAutomationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await toggleAutomation(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/automations");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAutomationAction(
  input: DeleteAutomationInput,
): Promise<{ error?: string }> {
  const parsed = deleteAutomationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await deleteAutomation(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/automations");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
