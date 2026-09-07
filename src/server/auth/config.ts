import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js config. This is the ONLY auth config
 * allowed to be imported from `middleware.ts` — it must never import
 * Prisma (or anything else that needs the Node.js runtime), because
 * Next.js middleware runs on the Edge runtime. The Credentials provider
 * (which does need Prisma to look up a user) lives in `./index.ts`
 * instead, which spreads this config and is used everywhere else
 * (route handlers, server components, server actions).
 */
export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isProtectedRoute =
        pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
