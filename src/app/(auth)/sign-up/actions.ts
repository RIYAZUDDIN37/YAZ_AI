"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/server/auth";
import { registerUser } from "@/services/auth/register";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { toActionError } from "@/lib/handle-error";

export async function signUpAction(
  input: RegisterInput,
): Promise<{ error?: string }> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await registerUser(parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      // Account was created but auto-login failed for some reason — send
      // them to sign in manually rather than losing the account entirely.
      return { error: "Account created. Please sign in." };
    }
    throw error;
  }
}
