import { stat } from "node:fs/promises";
import { join } from "node:path";
import { localBrowserProfileDir, sessionFilePath } from "../config/paths.js";
import type { EffectiveConfig } from "../config/store.js";
import { redact, redactUrl } from "../util/redact.js";
import type { StoredSession } from "./session-store.js";

export interface LocalProfileReadiness {
  profileDir: string;
  exists: boolean;
  lockFilePresent: boolean;
}

export interface AuthStatusReport {
  publicationUrl: string | null;
  browserRuntime: EffectiveConfig["browserRuntime"];
  browserbaseConfigured: boolean | null;
  stagehandModel: string;
  substackLoginConfigured: boolean;
  browserbaseSession: {
    present: boolean;
    sessionFile: string;
    browserbaseSessionId: string | null;
    publicationUrl: string | null;
    updatedAt: string | null;
    browserbaseSessionUrl: string | null;
    browserbaseDebugUrl: string | null;
  };
  localProfile: LocalProfileReadiness;
  apiAuthReadiness: {
    envCookieConfigured: boolean;
    localProfileAvailable: boolean;
    likelySource: "env" | "local-profile" | "none";
    validationCommand: string | null;
  };
  editorWriteReadiness: {
    status: "not-configured" | "needs-local-login" | "requires-live-check" | "runtime-session";
    message: string;
    traceSuggestion: string;
  };
  session: AuthStatusReport["browserbaseSession"] | null;
}

export async function readLocalProfileReadiness(): Promise<LocalProfileReadiness> {
  const profileDir = localBrowserProfileDir();
  const lockFile = join(profileDir, "chrome.pid");

  return {
    profileDir,
    exists: await exists(profileDir),
    lockFilePresent: await exists(lockFile),
  };
}

export function buildAuthStatusReport(
  config: EffectiveConfig,
  session: StoredSession | null,
  localProfile: LocalProfileReadiness,
): AuthStatusReport {
  const browserbaseSession = session
    ? {
        present: true,
        sessionFile: sessionFilePath(),
        browserbaseSessionId: redact(session.browserbaseSessionId),
        publicationUrl: session.publicationUrl,
        updatedAt: session.updatedAt,
        browserbaseSessionUrl: redactUrl(session.browserbaseSessionUrl),
        browserbaseDebugUrl: redactUrl(session.browserbaseDebugUrl),
      }
    : {
        present: false,
        sessionFile: sessionFilePath(),
        browserbaseSessionId: null,
        publicationUrl: null,
        updatedAt: null,
        browserbaseSessionUrl: null,
        browserbaseDebugUrl: null,
      };

  const apiAuthReadiness = {
    envCookieConfigured: Boolean(config.substackCookie),
    localProfileAvailable: localProfile.exists,
    likelySource: resolveLikelyApiSource(config, localProfile),
    validationCommand: config.publicationUrl
      ? "substack-cli api auth status --source local-profile"
      : null,
  };

  return {
    publicationUrl: config.publicationUrl ?? null,
    browserRuntime: config.browserRuntime,
    browserbaseConfigured:
      config.browserRuntime === "browserbase"
        ? Boolean(config.browserbaseApiKey && config.browserbaseProjectId)
        : null,
    stagehandModel: config.stagehandModel,
    substackLoginConfigured: Boolean(config.substackEmail && config.substackPassword),
    browserbaseSession,
    localProfile,
    apiAuthReadiness,
    editorWriteReadiness: buildEditorWriteReadiness(config, localProfile),
    session: browserbaseSession.present ? browserbaseSession : null,
  };
}

function resolveLikelyApiSource(
  config: EffectiveConfig,
  localProfile: LocalProfileReadiness,
): "env" | "local-profile" | "none" {
  if (config.substackCookie) return "env";
  if (localProfile.exists) return "local-profile";
  return "none";
}

function buildEditorWriteReadiness(
  config: EffectiveConfig,
  localProfile: LocalProfileReadiness,
): AuthStatusReport["editorWriteReadiness"] {
  const traceSuggestion = "Retry draft, publish, or schedule with `--trace-out <file>`.";

  if (!config.publicationUrl) {
    return {
      status: "not-configured",
      message: "Publication URL is not configured.",
      traceSuggestion,
    };
  }

  if (config.browserRuntime === "local" && !localProfile.exists) {
    return {
      status: "needs-local-login",
      message: "Local runtime is selected, but no local browser profile exists yet.",
      traceSuggestion,
    };
  }

  if (config.browserRuntime === "local") {
    return {
      status: "requires-live-check",
      message:
        "Local browser profile exists; editor write access is verified by draft, publish, or schedule commands.",
      traceSuggestion,
    };
  }

  return {
    status: "runtime-session",
    message: "Editor write access depends on the selected browser runtime session.",
    traceSuggestion,
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
