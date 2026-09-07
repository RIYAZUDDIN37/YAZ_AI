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

  REDIS_URL: z.string().optional(),

  AI_PROVIDER: z.enum(["mock", "anthropic"]).default("mock"),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_CHAT_MODEL: z.string().default("claude-opus-5"),
  AI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

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
