import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  BROWSERBASE_API_KEY: z.string().min(1).optional(),
  BROWSERBASE_PROJECT_ID: z.string().min(1).optional(),
  STAGEHAND_MODEL: z.string().min(1).default("openai/gpt-5"),
  SUBSTACK_PUBLICATION_URL: z.string().url().optional(),
  SUBSTACK_EMAIL: z.string().email().optional(),
  SUBSTACK_PASSWORD: z.string().min(1).optional(),
  SUBSTACK_COOKIE: z.string().min(1).optional(),
});

export type RuntimeEnv = z.infer<typeof EnvSchema>;

export function loadEnv(): RuntimeEnv {
  return EnvSchema.parse(process.env);
}

export function requireBrowserEnv(): RuntimeEnv {
  const env = loadEnv();
  const missing = [
    ["BROWSERBASE_API_KEY", env.BROWSERBASE_API_KEY],
    ["BROWSERBASE_PROJECT_ID", env.BROWSERBASE_PROJECT_ID],
    ["SUBSTACK_PUBLICATION_URL", env.SUBSTACK_PUBLICATION_URL],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing required browser environment variables: ${missing.join(", ")}`,
    );
  }

  return env;
}
