import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { loadEnv } from "./env.js";
import { configFilePath } from "./paths.js";

const AppConfigSchema = z.object({
  publicationUrl: z.string().url().optional(),
  publicationId: z.number().int().positive().optional(),
  browserRuntime: z.enum(["browserbase", "local", "camoufox"]).default("browserbase"),
  defaultMode: z.enum(["draft", "publish", "schedule"]).default("draft"),
  operatorMode: z.enum(["solo", "team", "agency", "ci"]).default("solo"),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type OperatorMode = AppConfig["operatorMode"];

export function parseAppConfig(input: unknown): AppConfig {
  return AppConfigSchema.parse(input);
}

export function safeParseAppConfig(input: unknown) {
  return AppConfigSchema.safeParse(input);
}

export interface OperatorPolicy {
  mode: OperatorMode;
  requiresExplicitConfirmation: boolean;
  defaultBrowserRuntime: AppConfig["browserRuntime"];
  secretsPolicy: "local-env" | "shared-env" | "ci-secrets";
  retentionDays: number;
  multiPublication: "single" | "review-required" | "required";
  auditLevel: "standard" | "shared" | "strict";
}

export interface EffectiveConfig extends AppConfig {
  browserbaseApiKey?: string | undefined;
  browserbaseProjectId?: string | undefined;
  stagehandModel: string;
  substackEmail?: string | undefined;
  substackPassword?: string | undefined;
  substackCookie?: string | undefined;
  uploadEndpoint?: string | undefined;
  uploadResponseField?: string | undefined;
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
  await writeFile(configFilePath(), `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

export async function updateConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
  const current = await loadConfig();
  const next = AppConfigSchema.parse({ ...current, ...patch });
  await saveConfig(next);
  return next;
}

export function buildOperatorPolicy(mode: OperatorMode): OperatorPolicy {
  switch (mode) {
    case "solo":
      return {
        mode,
        requiresExplicitConfirmation: true,
        defaultBrowserRuntime: "local",
        secretsPolicy: "local-env",
        retentionDays: 30,
        multiPublication: "single",
        auditLevel: "standard",
      };
    case "team":
      return {
        mode,
        requiresExplicitConfirmation: true,
        defaultBrowserRuntime: "browserbase",
        secretsPolicy: "shared-env",
        retentionDays: 90,
        multiPublication: "review-required",
        auditLevel: "shared",
      };
    case "agency":
      return {
        mode,
        requiresExplicitConfirmation: true,
        defaultBrowserRuntime: "browserbase",
        secretsPolicy: "shared-env",
        retentionDays: 180,
        multiPublication: "required",
        auditLevel: "strict",
      };
    case "ci":
      return {
        mode,
        requiresExplicitConfirmation: true,
        defaultBrowserRuntime: "browserbase",
        secretsPolicy: "ci-secrets",
        retentionDays: 14,
        multiPublication: "review-required",
        auditLevel: "strict",
      };
    default:
      throw new Error(`Unsupported operator mode: ${String(mode)}`);
  }
}

export async function loadEffectiveConfig(): Promise<EffectiveConfig> {
  const [config, env] = await Promise.all([loadConfig(), Promise.resolve(loadEnv())]);

  return {
    ...config,
    publicationUrl: env.SUBSTACK_PUBLICATION_URL ?? config.publicationUrl,
    browserbaseApiKey: env.BROWSERBASE_API_KEY,
    browserbaseProjectId: env.BROWSERBASE_PROJECT_ID,
    stagehandModel: env.STAGEHAND_MODEL,
    substackEmail: env.SUBSTACK_EMAIL,
    substackPassword: env.SUBSTACK_PASSWORD,
    substackCookie: env.SUBSTACK_COOKIE,
    uploadEndpoint: env.SUBSTACK_UPLOAD_ENDPOINT,
    uploadResponseField: env.SUBSTACK_UPLOAD_RESPONSE_FIELD,
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
    throw new Error(`Missing required Substack credential variables: ${missing.join(", ")}`);
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
    throw new Error(`Missing required Browserbase environment variables: ${missing.join(", ")}`);
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
