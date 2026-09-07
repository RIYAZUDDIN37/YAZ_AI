"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/server/authorization/require-session";
import { completeOnboarding } from "@/services/onboarding/complete-onboarding";
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/onboarding";
import { toActionError } from "@/lib/handle-error";

export async function completeOnboardingAction(
  input: OnboardingInput,
): Promise<{ error?: string }> {
  const session = await requireSession();

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await completeOnboarding(session.user.id, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  redirect("/dashboard");
}
