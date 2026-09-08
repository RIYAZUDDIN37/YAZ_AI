import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { UpdateAgentProfileInput } from "@/lib/validation/agent-config";

export async function updateAgentProfile(
  businessId: string,
  actorRole: OrgRole,
  agentId: string,
  input: UpdateAgentProfileInput,
) {
  if (!can(actorRole, "business:manage")) {
    throw new ForbiddenError("You don't have access to train the AI employee.");
  }

  const existing = await db.aIAgent.findFirst({ where: { id: agentId, businessId } });
  if (!existing) {
    throw new NotFoundError("That AI employee couldn't be found.");
  }

  const agent = await db.aIAgent.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      title: input.title,
      tone: input.tone || null,
      customInstructions: input.customInstructions || null,
    },
  });

  await writeAuditLog({
    action: "agent.profile_updated",
    businessId,
    metadata: { agentId: agent.id },
  });

  return agent;
}
