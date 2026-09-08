import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type {
  CreateAgentGoalInput,
  ToggleAgentGoalInput,
  DeleteAgentGoalInput,
} from "@/lib/validation/agent-config";

function requireTrainAccess(actorRole: OrgRole) {
  if (!can(actorRole, "business:manage")) {
    throw new ForbiddenError("You don't have access to train the AI employee.");
  }
}

export async function createAgentGoal(
  businessId: string,
  actorRole: OrgRole,
  agentId: string,
  input: CreateAgentGoalInput,
) {
  requireTrainAccess(actorRole);

  const count = await db.agentGoal.count({ where: { businessId, agentId } });
  const goal = await db.agentGoal.create({
    data: { businessId, agentId, description: input.description, order: count },
  });

  await writeAuditLog({
    action: "agent.goal_added",
    businessId,
    metadata: { goalId: goal.id, description: goal.description },
  });

  return goal;
}

export async function toggleAgentGoal(
  businessId: string,
  actorRole: OrgRole,
  input: ToggleAgentGoalInput,
) {
  requireTrainAccess(actorRole);

  const goal = await db.agentGoal.findFirst({ where: { id: input.goalId, businessId } });
  if (!goal) throw new NotFoundError("That goal couldn't be found.");

  return db.agentGoal.update({
    where: { id: goal.id },
    data: { isActive: input.isActive },
  });
}

export async function deleteAgentGoal(
  businessId: string,
  actorRole: OrgRole,
  input: DeleteAgentGoalInput,
) {
  requireTrainAccess(actorRole);

  const goal = await db.agentGoal.findFirst({ where: { id: input.goalId, businessId } });
  if (!goal) throw new NotFoundError("That goal couldn't be found.");

  await db.agentGoal.delete({ where: { id: goal.id } });

  await writeAuditLog({
    action: "agent.goal_removed",
    businessId,
    metadata: { goalId: goal.id },
  });
}
