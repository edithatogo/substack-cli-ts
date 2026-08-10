/**
 * Structured logging surface backed by `pino`.
 *
 * Design constraints (see `conductor/design.md` §4 Security Architecture and
 * the MCP stdio transport contract):
 *
 * - **MCP-safe:** The MCP server speaks JSON-RPC over stdout, so any human
 *   logging must target **stderr**. The default destination is `stderr` and
 *   the MCP entrypoint uses a dedicated silent-on-stdout child logger.
 * - **Secret-safe:** Integrates with `redact()` so configured secret keys are
 *   masked before serialization, extending the existing redaction layer.
 * - **Level-aware:** `LOG_LEVEL` env var controls verbosity (`fatal` → `trace`),
 *   defaulting to `info`. JSON is the default for machine consumption.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pino, { type Logger, type LoggerOptions } from "pino";

import { PACKAGE_VERSION } from "../version.js";
import { sanitizeStructured } from "./redact.js";

const moduleFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(moduleFile), "..");

type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

const VALID_LEVELS: readonly LogLevel[] = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
];

function resolveLevel(envValue: string | undefined): LogLevel {
  if (!envValue) {
    return "info";
  }
  const normalized = envValue.toLowerCase();
  return (VALID_LEVELS as readonly string[]).includes(normalized)
    ? (normalized as LogLevel)
    : "info";
}

/** Secret field paths that are always redacted in structured log output. */
const DEFAULT_REDACT_PATHS: string[] = [
  "*.password",
  "*.substackPassword",
  "*.browserbaseApiKey",
  "*.browserbaseProjectId",
  "*.substackEmail",
  "*.sessionToken",
  "*.cookie",
  "*.authorization",
  "password",
  "token",
  "secret",
  "apiKey",
];

export interface CreateLoggerOptions {
  /** Logical component name, e.g. `cli`, `mcp`, `browser`, `publish`. */
  name?: string;
  /** Override the level (defaults to `LOG_LEVEL` env or `info`). */
  level?: LogLevel;
  /** Additional pino redact paths beyond the secret defaults. */
  extraRedactPaths?: string[];
}

function buildBaseOptions(options: CreateLoggerOptions): LoggerOptions {
  const level = options.level ?? resolveLevel(process.env.LOG_LEVEL);

  const redactPaths = [...DEFAULT_REDACT_PATHS, ...(options.extraRedactPaths ?? [])];

  const base: LoggerOptions = {
    name: options.name ?? "substack-cli",
    level: level === "silent" ? "silent" : level,
    base: { version: PACKAGE_VERSION },
    redact: {
      paths: redactPaths,
      censor: "[REDACTED]",
    },
    formatters: {
      bindings(bindings) {
        return sanitizeStructured(bindings) as Record<string, unknown>;
      },
      log(object) {
        return sanitizeStructured(object) as Record<string, unknown>;
      },
    },
    // Crucial for MCP safety: never write logs to stdout.
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  return base;
}

/**
 * Create a structured logger. Output is JSON to stderr by default.
 *
 * @example
 * const log = createLogger({ name: "publish" });
 * log.info({ file: postPath }, "starting publish");
 */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const opts = buildBaseOptions(options);
  // Pass stderr as the explicit destination so JSON output never lands on
  // stdout (which would corrupt MCP JSON-RPC framing).
  return pino(opts, process.stderr);
}

/**
 * The shared root logger. Components can derive children via
 * `rootLogger.child({ component: "browser" })`.
 */
export const rootLogger: Logger = createLogger({ name: "substack-cli" });

/**
 * A logger that is guaranteed silent. Used by the MCP stdio server to avoid
 * any risk of corrupting JSON-RPC framing on stdout, while still giving
 * library code a valid `Logger` to call.
 */
export const silentLogger: Logger = pino({ level: "silent", name: "silent" });

/**
 * Read the package version via the logger's own resolution path. Exposed for
 * diagnostic commands that want to report the version alongside log config.
 */
export function getLoggedPackageVersion(): string {
  return PACKAGE_VERSION;
}

/**
 * Internal helper for tests: re-read the version from disk without caching.
 * Not exported for general use; production code should import `PACKAGE_VERSION`.
 */
export function __readVersionForTest(): string {
  const manifestPath = resolve(projectRoot, "package.json");
  const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    version?: unknown;
  };
  return typeof parsed.version === "string" ? parsed.version : "";
}
