import { z } from "zod";

export const orderStatusValues = ["PENDING", "CONFIRMED", "FULFILLED", "CANCELLED"] as const;

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(orderStatusValues),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const addOrderItemSchema = z.object({
  orderId: z.string().min(1),
  catalogueItemId: z.string().min(1, "Pick an item"),
  quantity: z.coerce.number().int().positive("Enter a quantity"),
});
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;

export const addOrderItemFormSchema = addOrderItemSchema.extend({
  quantity: z.string().trim().min(1, "Enter a quantity"),
});
export type AddOrderItemFormValues = z.infer<typeof addOrderItemFormSchema>;

export const removeOrderItemSchema = z.object({ itemId: z.string().min(1) });
export type RemoveOrderItemInput = z.infer<typeof removeOrderItemSchema>;

export const paymentMethodValues = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"] as const;

export const recordPaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.coerce.number().positive("Enter an amount"),
  method: z.enum(paymentMethodValues),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const recordPaymentFormSchema = recordPaymentSchema.extend({
  amount: z.string().trim().min(1, "Enter an amount"),
});
export type RecordPaymentFormValues = z.infer<typeof recordPaymentFormSchema>;
