import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type {
  CreateAgentRuleInput,
  ToggleAgentRuleInput,
  DeleteAgentRuleInput,
} from "@/lib/validation/agent-config";

function requireTrainAccess(actorRole: OrgRole) {
  if (!can(actorRole, "business:manage")) {
    throw new ForbiddenError("You don't have access to train the AI employee.");
  }
}

export async function createAgentRule(
  businessId: string,
  actorRole: OrgRole,
  agentId: string,
  input: CreateAgentRuleInput,
) {
  requireTrainAccess(actorRole);

  const count = await db.agentRule.count({ where: { businessId, agentId } });
  const rule = await db.agentRule.create({
    data: { businessId, agentId, instruction: input.instruction, order: count },
  });

  await writeAuditLog({
    action: "agent.rule_added",
    businessId,
    metadata: { ruleId: rule.id, instruction: rule.instruction },
  });

  return rule;
}

export async function toggleAgentRule(
  businessId: string,
  actorRole: OrgRole,
  input: ToggleAgentRuleInput,
) {
  requireTrainAccess(actorRole);

  const rule = await db.agentRule.findFirst({ where: { id: input.ruleId, businessId } });
  if (!rule) throw new NotFoundError("That rule couldn't be found.");

  return db.agentRule.update({
    where: { id: rule.id },
    data: { isActive: input.isActive },
  });
}

export async function deleteAgentRule(
  businessId: string,
  actorRole: OrgRole,
  input: DeleteAgentRuleInput,
) {
  requireTrainAccess(actorRole);

  const rule = await db.agentRule.findFirst({ where: { id: input.ruleId, businessId } });
  if (!rule) throw new NotFoundError("That rule couldn't be found.");

  await db.agentRule.delete({ where: { id: rule.id } });

  await writeAuditLog({
    action: "agent.rule_removed",
    businessId,
    metadata: { ruleId: rule.id },
  });
}
