import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { loadSession } from "../auth/session-store.js";
import {
  configFilePath,
  localBrowserProfileDir,
  sessionFilePath,
  stateDir,
} from "../config/paths.js";
import { loadEffectiveConfig, type EffectiveConfig } from "../config/store.js";

export type DoctorStatus = "ok" | "warn" | "error";

export interface DoctorCheck {
  name: string;
  status: DoctorStatus;
  message: string;
  details?: Record<string, unknown> | undefined;
}

export interface DoctorReport {
  status: DoctorStatus;
  checks: DoctorCheck[];
}

const REQUIRED_IGNORES = [
  ".env",
  ".env.*",
  ".substack-cli/",
  "dist/",
  "node_modules/",
  "coverage/",
  "reports/",
  ".stryker-tmp/",
];

export async function runDoctor(): Promise<DoctorReport> {
  const config = await loadEffectiveConfig();
  const checks: DoctorCheck[] = [
    checkPublication(config),
    checkTransport(config),
    checkSubstackCredentials(config),
    await checkApiReadiness(config),
    await checkSession(),
    await checkLocalProfile(),
    await checkGitignore(),
  ];

  return {
    status: summarizeStatus(checks),
    checks,
  };
}

export function summarizeStatus(checks: DoctorCheck[]): DoctorStatus {
  if (checks.some((check) => check.status === "error")) {
    return "error";
  }

  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }

  return "ok";
}

export function checkPublication(config: EffectiveConfig): DoctorCheck {
  if (!config.publicationUrl) {
    return {
      name: "publication",
      status: "error",
      message:
        "No publication URL configured. Set SUBSTACK_PUBLICATION_URL or run `substack-cli config set-publication <url>`.",
    };
  }

  return {
    name: "publication",
    status: "ok",
    message: "Publication URL is configured.",
    details: { host: new URL(config.publicationUrl).host },
  };
}

export function checkTransport(config: EffectiveConfig): DoctorCheck {
  if (config.browserRuntime === "browserbase") {
    const missing = [
      ["BROWSERBASE_API_KEY", config.browserbaseApiKey],
      ["BROWSERBASE_PROJECT_ID", config.browserbaseProjectId],
    ].filter(([, value]) => !value);

    if (missing.length > 0) {
      return {
        name: "transport",
        status: "error",
        message: `Browserbase runtime is selected but missing ${missing.map(([name]) => name).join(", ")}.`,
        details: { runtime: config.browserRuntime },
      };
    }
  }

  if (config.browserRuntime === "camoufox") {
    return {
      name: "transport",
      status: "warn",
      message:
        "Camoufox runtime is planned but not fully validated; use local runtime for current live drafting.",
      details: { runtime: config.browserRuntime },
    };
  }

  return {
    name: "transport",
    status: "ok",
    message: `${config.browserRuntime} runtime is configured.`,
    details: { runtime: config.browserRuntime },
  };
}

export function checkSubstackCredentials(config: EffectiveConfig): DoctorCheck {
  const hasEmail = Boolean(config.substackEmail);
  const hasPassword = Boolean(config.substackPassword);

  if (hasEmail && hasPassword) {
    return {
      name: "substack-login",
      status: "ok",
      message: "Substack login variables are configured.",
      details: {
        emailConfigured: true,
        passwordConfigured: true,
        cookieConfigured: Boolean(config.substackCookie),
      },
    };
  }

  if (hasEmail || hasPassword) {
    return {
      name: "substack-login",
      status: "warn",
      message:
        "Substack login variables are partially configured. Set both SUBSTACK_EMAIL and SUBSTACK_PASSWORD for local auto-login.",
      details: {
        emailConfigured: hasEmail,
        passwordConfigured: hasPassword,
        cookieConfigured: Boolean(config.substackCookie),
      },
    };
  }

  return {
    name: "substack-login",
    status: "warn",
    message: "Substack login variables are not configured. Manual local login can still be used.",
    details: {
      emailConfigured: false,
      passwordConfigured: false,
      cookieConfigured: Boolean(config.substackCookie),
    },
  };
}

async function checkApiReadiness(config: EffectiveConfig): Promise<DoctorCheck> {
  const hasCookie = Boolean(config.substackCookie);
  const hasLocalProfile = await exists(localBrowserProfileDir());

  if (hasCookie || hasLocalProfile) {
    return {
      name: "api-readiness",
      status: "ok",
      message: "Read-only API probes have a usable local auth source.",
      details: {
        authSource: hasCookie ? "env" : "local-profile",
        probeEndpoints: [
          "https://substack.com/api/v1/handle/options",
          "https://substack.com/api/v1/user/{handle}/public_profile",
          "/api/v1/publication",
        ],
      },
    };
  }

  return {
    name: "api-readiness",
    status: "warn",
    message:
      "No local auth source is ready for read-only API probes. Configure SUBSTACK_COOKIE or create a logged-in local browser profile.",
    details: {
      authSource: "none",
      probeEndpoints: [
        "https://substack.com/api/v1/handle/options",
        "https://substack.com/api/v1/user/{handle}/public_profile",
        "/api/v1/publication",
      ],
    },
  };
}

async function checkSession(): Promise<DoctorCheck> {
  const session = await loadSession();

  if (!session) {
    return {
      name: "browserbase-session",
      status: "warn",
      message: "No Browserbase session metadata is stored.",
      details: { sessionFile: sessionFilePath() },
    };
  }

  return {
    name: "browserbase-session",
    status: "ok",
    message: "Browserbase session metadata is present.",
    details: {
      sessionFile: sessionFilePath(),
      publicationUrl: session.publicationUrl,
      updatedAt: session.updatedAt,
    },
  };
}

async function checkLocalProfile(): Promise<DoctorCheck> {
  const profileDir = localBrowserProfileDir();

  if (!(await exists(profileDir))) {
    return {
      name: "local-browser-profile",
      status: "warn",
      message:
        "No local browser profile exists yet. Run `substack-cli auth login` with local runtime to create one.",
      details: { profileDir },
    };
  }

  const lockFile = join(profileDir, "chrome.pid");
  const hasLockFile = await exists(lockFile);

  return {
    name: "local-browser-profile",
    status: hasLockFile ? "warn" : "ok",
    message: hasLockFile
      ? "Local browser profile exists but has a chrome.pid lock file. If Chrome is closed, remove the stale lock."
      : "Local browser profile exists.",
    details: { profileDir, lockFilePresent: hasLockFile },
  };
}

async function checkGitignore(): Promise<DoctorCheck> {
  const raw = await readFileIfExists(".gitignore");

  if (raw === null) {
    return {
      name: "gitignore",
      status: "error",
      message:
        ".gitignore is missing; local secrets and runtime state may be committed accidentally.",
    };
  }

  const missing = REQUIRED_IGNORES.filter((entry) => !raw.includes(entry));

  if (missing.length > 0) {
    return {
      name: "gitignore",
      status: "error",
      message: "Missing required ignore patterns for local secrets or generated output.",
      details: { missing },
    };
  }

  return {
    name: "gitignore",
    status: "ok",
    message: "Required local secret and generated-output patterns are ignored.",
    details: {
      stateDir: stateDir(),
      configFile: configFilePath(),
      requiredPatterns: REQUIRED_IGNORES,
    },
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readFileIfExists(path: string): Promise<string | null> {
  try {
    await access(path);
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}
