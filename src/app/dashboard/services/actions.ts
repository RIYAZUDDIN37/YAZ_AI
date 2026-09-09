"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { createService } from "@/services/services/create-service";
import { updateService } from "@/services/services/update-service";
import {
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type UpdateServiceInput,
} from "@/lib/validation/services";
import { toActionError } from "@/lib/handle-error";

async function currentBusiness() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { membership, business };
}

export async function createServiceAction(
  input: CreateServiceInput,
): Promise<{ error?: string; serviceId?: string }> {
  const parsed = createServiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const service = await createService(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/services");
    return { serviceId: service.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateServiceAction(
  input: UpdateServiceInput,
): Promise<{ error?: string }> {
  const parsed = updateServiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const service = await updateService(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/services");
    revalidatePath(`/dashboard/services/${service.id}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
