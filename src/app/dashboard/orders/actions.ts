"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { createOrder } from "@/services/orders/create-order";
import { addOrderItem, removeOrderItem } from "@/services/orders/items";
import { updateOrderStatus } from "@/services/orders/update-status";
import { recordPayment } from "@/services/orders/record-payment";
import {
  createOrderSchema,
  addOrderItemSchema,
  removeOrderItemSchema,
  updateOrderStatusSchema,
  recordPaymentSchema,
  type CreateOrderInput,
  type AddOrderItemInput,
  type RemoveOrderItemInput,
  type UpdateOrderStatusInput,
  type RecordPaymentInput,
} from "@/lib/validation/orders";
import { toActionError } from "@/lib/handle-error";

async function currentBusiness() {
  const { session, membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { session, membership, business };
}

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<{ error?: string; orderId?: string }> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const order = await createOrder(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/orders");
    return { orderId: order.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addOrderItemAction(input: AddOrderItemInput): Promise<{ error?: string }> {
  const parsed = addOrderItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await addOrderItem(business.id, membership.role, parsed.data);
    revalidatePath(`/dashboard/orders/${parsed.data.orderId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeOrderItemAction(
  orderId: string,
  input: RemoveOrderItemInput,
): Promise<{ error?: string }> {
  const parsed = removeOrderItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await removeOrderItem(business.id, membership.role, parsed.data);
    revalidatePath(`/dashboard/orders/${orderId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOrderStatusAction(
  input: UpdateOrderStatusInput,
): Promise<{ error?: string }> {
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await updateOrderStatus(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${parsed.data.orderId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordPaymentAction(input: RecordPaymentInput): Promise<{ error?: string }> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { session, membership, business } = await currentBusiness();
  try {
    await recordPayment(business.id, session.user.id, membership.role, parsed.data);
    revalidatePath(`/dashboard/orders/${parsed.data.orderId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
