"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { createCustomer } from "@/services/customers/create-customer";
import { updateCustomer } from "@/services/customers/update-customer";
import { addCustomerNote } from "@/services/customers/add-customer-note";
import {
  createCustomerSchema,
  updateCustomerSchema,
  addCustomerNoteSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type AddCustomerNoteInput,
} from "@/lib/validation/customers";
import { toActionError } from "@/lib/handle-error";

async function currentBusiness() {
  const { session, membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { session, membership, business };
}

export async function createCustomerAction(
  input: CreateCustomerInput,
): Promise<{ error?: string; customerId?: string }> {
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const customer = await createCustomer(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/customers");
    return { customerId: customer.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCustomerAction(
  input: UpdateCustomerInput,
): Promise<{ error?: string }> {
  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const customer = await updateCustomer(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${customer.id}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function addCustomerNoteAction(
  input: AddCustomerNoteInput,
): Promise<{ error?: string }> {
  const parsed = addCustomerNoteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { session, membership, business } = await currentBusiness();
  try {
    await addCustomerNote(business.id, session.user.id, membership.role, parsed.data);
    revalidatePath(`/dashboard/customers/${parsed.data.customerId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
