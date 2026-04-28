import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { configFilePath } from "./paths.js";
import { loadEnv } from "./env.js";

const AppConfigSchema = z.object({
  publicationUrl: z.string().url().optional(),
  browserRuntime: z
    .enum(["browserbase", "local", "camoufox"])
    .default("browserbase"),
  defaultMode: z.enum(["draft", "publish", "schedule"]).default("draft"),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export interface EffectiveConfig extends AppConfig {
  browserbaseApiKey?: string | undefined;
  browserbaseProjectId?: string | undefined;
  stagehandModel: string;
  substackEmail?: string | undefined;
  substackPassword?: string | undefined;
  substackCookie?: string | undefined;
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await readFile(configFilePath(), "utf8");
    return AppConfigSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isMissingFile(error)) {
      return AppConfigSchema.parse({});
    }

    throw error;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const parsed = AppConfigSchema.parse(config);
  await mkdir(dirname(configFilePath()), { recursive: true });
  await writeFile(
    configFilePath(),
    `${JSON.stringify(parsed, null, 2)}\n`,
    "utf8",
  );
}

export async function updateConfig(
  patch: Partial<AppConfig>,
): Promise<AppConfig> {
  const current = await loadConfig();
  const next = AppConfigSchema.parse({ ...current, ...patch });
  await saveConfig(next);
  return next;
}

export async function loadEffectiveConfig(): Promise<EffectiveConfig> {
  const [config, env] = await Promise.all([
    loadConfig(),
    Promise.resolve(loadEnv()),
  ]);

  return {
    ...config,
    publicationUrl: env.SUBSTACK_PUBLICATION_URL ?? config.publicationUrl,
    browserbaseApiKey: env.BROWSERBASE_API_KEY,
    browserbaseProjectId: env.BROWSERBASE_PROJECT_ID,
    stagehandModel: env.STAGEHAND_MODEL,
    substackEmail: env.SUBSTACK_EMAIL,
    substackPassword: env.SUBSTACK_PASSWORD,
    substackCookie: env.SUBSTACK_COOKIE,
  };
}

export function requireSubstackCredentials(config: EffectiveConfig): {
  email: string;
  password: string;
} {
  const missing = [
    ["SUBSTACK_EMAIL", config.substackEmail],
    ["SUBSTACK_PASSWORD", config.substackPassword],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Substack credential variables: ${missing.join(", ")}`,
    );
  }

  return {
    email: config.substackEmail!,
    password: config.substackPassword!,
  };
}

export function requirePublicationUrl(config: EffectiveConfig): string {
  if (!config.publicationUrl) {
    throw new Error(
      "Missing publication URL. Set SUBSTACK_PUBLICATION_URL or run `substack-cli config set-publication <url>`.",
    );
  }

  return config.publicationUrl;
}

export function requireBrowserbaseConfig(config: EffectiveConfig): void {
  const missing = [
    ["BROWSERBASE_API_KEY", config.browserbaseApiKey],
    ["BROWSERBASE_PROJECT_ID", config.browserbaseProjectId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Browserbase environment variables: ${missing.join(", ")}`,
    );
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
