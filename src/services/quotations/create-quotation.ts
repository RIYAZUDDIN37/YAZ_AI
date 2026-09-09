import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { CreateQuotationInput } from "@/lib/validation/quotations";

export async function createQuotation(
  businessId: string,
  actorRole: OrgRole,
  input: CreateQuotationInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage quotations.");
  }

  const customer = await db.customer.findFirst({ where: { id: input.customerId, businessId } });
  if (!customer) {
    throw new NotFoundError("That customer couldn't be found.");
  }

  if (input.leadId) {
    const lead = await db.lead.findFirst({ where: { id: input.leadId, businessId, customerId: customer.id } });
    if (!lead) {
      throw new NotFoundError("That lead couldn't be found for this customer.");
    }
  }

  const quotation = await db.quotation.create({
    data: {
      businessId,
      customerId: customer.id,
      leadId: input.leadId || null,
      notes: input.notes || null,
      status: "DRAFT",
    },
  });

  await writeAuditLog({
    action: "quotation.created",
    businessId,
    metadata: { quotationId: quotation.id, customerId: customer.id },
  });

  return quotation;
}
