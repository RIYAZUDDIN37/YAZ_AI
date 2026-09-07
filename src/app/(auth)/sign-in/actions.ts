"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/server/auth";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export async function signInAction(
  input: LoginInput,
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Incorrect email or password." };
        default:
          return { error: "Couldn't sign you in. Please try again." };
      }
    }
    // NextAuth's own redirect (on success) is implemented as a thrown
    // error — it must propagate, not be swallowed here.
    throw error;
  }
}
