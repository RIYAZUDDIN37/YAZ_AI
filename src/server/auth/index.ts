import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/server/db/client";
import { authConfig } from "./config";
import { loginSchema } from "@/lib/validation/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!passwordMatches) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
