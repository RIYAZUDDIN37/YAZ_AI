import { AppError } from "@/lib/errors";

/**
 * Every server action funnels its catch block through this. Known
 * (AppError) failures surface their real message to the user. Anything
 * else is logged with full detail on the server and reported to the user
 * generically — we never leak stack traces or raw error messages to the
 * client (see docs/SECURITY.md).
 */
export function toActionError(error: unknown): { error: string } {
  if (error instanceof AppError) {
    return { error: error.message };
  }

  console.error("[unhandled action error]", error);
  return { error: "Something went wrong. Please try again." };
}
