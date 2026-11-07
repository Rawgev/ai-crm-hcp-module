import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().default("openai/gpt-oss-20b"),
  GROQ_CONTEXT_MODEL: z.string().default("openai/gpt-oss-120b"),
  AI_REQUEST_TIMEOUT_SECONDS: z.coerce.number().default(12),
  DATABASE_URL: z.string().default("postgresql://crm_user:crm_password@localhost:5432/ai_crm?schema=public"),
  JWT_SECRET: z.string().default("super-secret-jwt-key-replace-in-production-min-32-chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_ORIGINS: z.string().default("http://localhost:3000,http://localhost:5173"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedConfig: EnvConfig | null = null;

export function getAppConfig(): EnvConfig {
  if (!parsedConfig) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.warn("Environment validation warnings:", result.error.format());
      parsedConfig = envSchema.parse({
        ...process.env,
        GROQ_API_KEY: process.env.GROQ_API_KEY || "",
      });
    } else {
      parsedConfig = result.data;
    }
  }
  return parsedConfig;
}

