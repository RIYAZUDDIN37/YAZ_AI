import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError, AppError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { UpdateQuotationStatusInput } from "@/lib/validation/quotations";

export async function updateQuotationStatus(
  businessId: string,
  actorRole: OrgRole,
  input: UpdateQuotationStatusInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage quotations.");
  }

  const quotation = await db.quotation.findFirst({
    where: { id: input.quotationId, businessId },
    include: { _count: { select: { items: true } } },
  });
  if (!quotation) {
    throw new NotFoundError("That quotation couldn't be found.");
  }
  if (input.status === "SENT" && quotation._count.items === 0) {
    throw new AppError("Add at least one item before sending a quotation.");
  }

  const updated = await db.quotation.update({
    where: { id: quotation.id },
    data: { status: input.status },
  });

  await writeAuditLog({
    action: "quotation.status_changed",
    businessId,
    metadata: { quotationId: quotation.id, from: quotation.status, to: input.status },
  });

  return updated;
}
