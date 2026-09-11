import { z } from "zod";

/**
 * Single source of truth for environment configuration. Every other module
 * imports `env` from here instead of touching `process.env` directly, so a
 * missing/malformed variable fails loudly at startup with a readable
 * message instead of surfacing as a mysterious `undefined` three layers
 * deep inside a route handler.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\//,
      "must be a postgres:// or postgresql:// connection string",
    ),

  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  NEXTAUTH_URL: z.url().optional(),
  // Auth.js reads this directly from process.env by its own convention —
  // required once the app runs under `next start` (production mode).
  // Dev mode (`next dev`) silently trusts localhost; production mode
  // rejects any host it wasn't explicitly told to trust, which otherwise
  // surfaces as an opaque "UntrustedHost" error on every sign-in attempt.
  AUTH_TRUST_HOST: z.string().optional(),

  REDIS_URL: z.string().optional(),

  AI_PROVIDER: z.enum(["mock", "anthropic", "ollama"]).default("mock"),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_CHAT_MODEL: z.string().default("claude-opus-5"),
  AI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  // Local, self-hosted provider (AI_PROVIDER="ollama") — no key needed,
  // points at the `ollama` docker-compose service (or one already running
  // on this machine) instead of a paid cloud API.
  OLLAMA_BASE_URL: z.url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3.2"),

  // Real email delivery for the NOTIFY_TEAM automation action (see
  // src/services/notifications/send-email.ts). Optional on purpose —
  // automations must keep working (in-app notification only) with no
  // key configured, same "never break the real action" rule the
  // automation engine already follows for everything else.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("YAZ AI <onboarding@resend.dev>"),

  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration. Check your .env against .env.example:\n${issues}`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export type Env = typeof env;
