import { db } from "@/server/db/client";
import { ForbiddenError, AppError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole, Prisma } from "@prisma/client";
import type { CreateAutomationInput } from "@/lib/validation/automations";

export async function createAutomation(
  businessId: string,
  actorRole: OrgRole,
  input: CreateAutomationInput,
) {
  if (!can(actorRole, "business:manage")) {
    throw new ForbiddenError("You don't have access to manage automations.");
  }

  if (input.actionType === "CHANGE_LEAD_STATUS" && !input.actionStatus) {
    throw new AppError("Pick the status this automation should set.");
  }
  if ((input.actionType === "NOTIFY_TEAM" || input.actionType === "ADD_LEAD_NOTE") && !input.actionMessage) {
    throw new AppError("Enter a message for this automation to use.");
  }

  const triggerConfig: Prisma.InputJsonValue | undefined =
    input.triggerEvent === "LEAD_STATUS_CHANGED" && input.triggerStatus
      ? { status: input.triggerStatus }
      : undefined;

  const actionConfig: Prisma.InputJsonValue =
    input.actionType === "CHANGE_LEAD_STATUS"
      ? { status: input.actionStatus }
      : { message: input.actionMessage };

  return db.automation.create({
    data: {
      businessId,
      name: input.name,
      triggerEvent: input.triggerEvent,
      triggerConfig,
      actionType: input.actionType,
      actionConfig,
    },
  });
}
