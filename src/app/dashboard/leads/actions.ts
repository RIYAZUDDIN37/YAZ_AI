"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { createLead } from "@/services/leads/create-lead";
import { updateLeadStatus } from "@/services/leads/update-status";
import { addLeadNote } from "@/services/leads/add-lead-note";
import {
  createLeadSchema,
  updateLeadStatusSchema,
  addLeadNoteSchema,
  type CreateLeadInput,
  type UpdateLeadStatusInput,
  type AddLeadNoteInput,
} from "@/lib/validation/leads";
import { toActionError } from "@/lib/handle-error";

async function currentBusiness() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { membership, business };
}

export async function createLeadAction(
  input: CreateLeadInput,
): Promise<{ error?: string; leadId?: string }> {
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const lead = await createLead(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/leads");
    return { leadId: lead.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateLeadStatusAction(
  input: UpdateLeadStatusInput,
): Promise<{ error?: string }> {
  const parsed = updateLeadStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const lead = await updateLeadStatus(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/leads");
    revalidatePath(`/dashboard/leads/${lead.id}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function addLeadNoteAction(
  input: AddLeadNoteInput,
): Promise<{ error?: string }> {
  const parsed = addLeadNoteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await addLeadNote(business.id, membership.role, parsed.data);
    revalidatePath(`/dashboard/leads/${parsed.data.leadId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
