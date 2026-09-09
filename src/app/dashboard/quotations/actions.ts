"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { createQuotation } from "@/services/quotations/create-quotation";
import { addQuotationItem, removeQuotationItem } from "@/services/quotations/items";
import { updateQuotationStatus } from "@/services/quotations/update-status";
import { convertQuotationToOrder } from "@/services/quotations/convert-to-order";
import {
  createQuotationSchema,
  addQuotationItemSchema,
  removeQuotationItemSchema,
  updateQuotationStatusSchema,
  type CreateQuotationInput,
  type AddQuotationItemInput,
  type RemoveQuotationItemInput,
  type UpdateQuotationStatusInput,
} from "@/lib/validation/quotations";
import { toActionError } from "@/lib/handle-error";

async function currentBusiness() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { membership, business };
}

export async function createQuotationAction(
  input: CreateQuotationInput,
): Promise<{ error?: string; quotationId?: string }> {
  const parsed = createQuotationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const quotation = await createQuotation(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/quotations");
    return { quotationId: quotation.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addQuotationItemAction(
  input: AddQuotationItemInput,
): Promise<{ error?: string }> {
  const parsed = addQuotationItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await addQuotationItem(business.id, membership.role, parsed.data);
    revalidatePath(`/dashboard/quotations/${parsed.data.quotationId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeQuotationItemAction(
  quotationId: string,
  input: RemoveQuotationItemInput,
): Promise<{ error?: string }> {
  const parsed = removeQuotationItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await removeQuotationItem(business.id, membership.role, parsed.data);
    revalidatePath(`/dashboard/quotations/${quotationId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateQuotationStatusAction(
  input: UpdateQuotationStatusInput,
): Promise<{ error?: string }> {
  const parsed = updateQuotationStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await updateQuotationStatus(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/quotations/${parsed.data.quotationId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function convertQuotationToOrderAction(
  quotationId: string,
): Promise<{ error?: string; orderId?: string }> {
  const { membership, business } = await currentBusiness();
  try {
    const order = await convertQuotationToOrder(business.id, membership.role, quotationId);
    revalidatePath(`/dashboard/quotations/${quotationId}`);
    revalidatePath("/dashboard/orders");
    return { orderId: order.id };
  } catch (error) {
    return toActionError(error);
  }
}
