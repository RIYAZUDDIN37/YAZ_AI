import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { RecordPaymentInput } from "@/lib/validation/orders";

/**
 * Records a payment the business already received (cash, UPI, bank
 * transfer, card) — there's no payment gateway wired, so this is
 * honestly a ledger entry a staff member enters, not a live transaction.
 * See the section comment on Payment in schema.prisma.
 */
export async function recordPayment(
  businessId: string,
  actorUserId: string,
  actorRole: OrgRole,
  input: RecordPaymentInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to record payments.");
  }

  const order = await db.order.findFirst({ where: { id: input.orderId, businessId } });
  if (!order) {
    throw new NotFoundError("That order couldn't be found.");
  }

  const payment = await db.payment.create({
    data: {
      businessId,
      orderId: order.id,
      amount: input.amount,
      method: input.method,
      reference: input.reference || null,
      recordedByUserId: actorUserId,
    },
  });

  await writeAuditLog({
    action: "payment.recorded",
    businessId,
    userId: actorUserId,
    metadata: { paymentId: payment.id, orderId: order.id, amount: input.amount, method: input.method },
  });

  return payment;
}
