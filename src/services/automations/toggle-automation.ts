import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import type { ToggleAutomationInput } from "@/lib/validation/automations";

export async function toggleAutomation(
  businessId: string,
  actorRole: OrgRole,
  input: ToggleAutomationInput,
) {
  if (!can(actorRole, "business:manage")) {
    throw new ForbiddenError("You don't have access to manage automations.");
  }

  const automation = await db.automation.findFirst({ where: { id: input.automationId, businessId } });
  if (!automation) {
    throw new NotFoundError("That automation couldn't be found.");
  }

  return db.automation.update({
    where: { id: automation.id },
    data: { isActive: input.isActive },
  });
}
