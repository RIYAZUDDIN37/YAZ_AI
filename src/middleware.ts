import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";

// Edge-safe middleware: only decides who is allowed past the gate
// (see authConfig.callbacks.authorized). The actual Credentials/DB-backed
// auth logic lives in src/server/auth/index.ts and never runs here.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
