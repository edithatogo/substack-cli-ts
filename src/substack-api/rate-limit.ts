import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { stateDir } from "../config/paths.js";

export type RateLimitChannel = "read" | "write";

export type RateLimitPolicySource = "default" | "server-header" | "operator";

export type RateLimitConfidence = "low" | "medium" | "high";

export interface RateLimitClassPolicy {
  minIntervalMs: number;
  baseDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
}

export interface RateLimitHeaderSnapshot {
  rateLimitLimit?: number | undefined;
  rateLimitRemaining?: number | undefined;
  rateLimitResetMs?: number | undefined;
  xRateLimitLimit?: number | undefined;
  xRateLimitRemaining?: number | undefined;
  xRateLimitResetMs?: number | undefined;
  retryAfterMs?: number | undefined;
}

export interface RateLimitChannelRuntime {
  nextAllowedAtMs: number;
  cooldownUntilMs: number;
  consecutiveFailureCount: number;
  lastRetryAfterMs?: number | undefined;
  lastStatus?: number | undefined;
  lastObservedAtMs: number;
  lastEndpointClass?: RateLimitChannel | undefined;
  lastRateLimitHeaders?: RateLimitHeaderSnapshot | undefined;
}

export interface RateLimitChannelState extends RateLimitClassPolicy {
  runtime: RateLimitChannelRuntime;
}

export interface RateLimitPolicyState {
  source: RateLimitPolicySource;
  confidence: RateLimitConfidence;
  observedAt: string;
  expiresAt?: string | undefined;
  note?: string | undefined;
}

export interface RateLimitRuntimeState {
  schemaVersion: 1;
  updatedAt: string;
  source: RateLimitPolicySource;
  confidence: RateLimitConfidence;
  policyObservedAt: string;
  note?: string | undefined;
  policyExpiresAt?: string | undefined;
  read: RateLimitChannelState;
  write: RateLimitChannelState;
}

export interface RateLimitStatusReport {
  schemaVersion: 1;
  source: RateLimitPolicySource;
  confidence: RateLimitConfidence;
  updatedAt: string;
  observedAt?: string | undefined;
  expiresAt?: string | undefined;
  note?: string | undefined;
  channels: Record<
    RateLimitChannel,
    Omit<RateLimitChannelState, "runtime"> & {
      nextAllowedInMs: number;
      cooldownInMs: number;
    }
  >;
  metadata: {
    lastObserved?: {
      read?: {
        lastStatus?: number | undefined;
        lastObservedAt?: string | undefined;
        retryAfterMs?: number | undefined;
        consecutiveFailureCount: number;
      };
      write?: {
        lastStatus?: number | undefined;
        lastObservedAt?: string | undefined;
        retryAfterMs?: number | undefined;
        consecutiveFailureCount: number;
      };
    };
    headers?: {
      read?: RateLimitHeaderSnapshot | undefined;
      write?: RateLimitHeaderSnapshot | undefined;
    };
  };
}

export interface RateLimitController {
  readonly state: RateLimitRuntimeState;
  readonly readGovernor: RateLimitGovernor;
  readonly writeGovernor: RateLimitGovernor;
  persist(context: RateLimitPersistenceContext): Promise<void>;
}

export interface RateLimitPersistenceContext {
  channel: RateLimitChannel;
  observedStatus: number;
}

export interface RateLimitPersistenceOptions {
  maxRetries?: number | undefined;
  baseDelayMs?: number | undefined;
  save?: ((state: RateLimitRuntimeState, path: string) => Promise<void>) | undefined;
  sleep?: ((ms: number) => Promise<void>) | undefined;
}

export class RateLimitStatePersistenceError extends Error {
  readonly name = "RateLimitStatePersistenceError";

  constructor(
    readonly channel: RateLimitChannel,
    readonly observedStatus: number,
    readonly attempts: number,
    readonly statePath: string,
    readonly cause: unknown,
  ) {
    super(
      `Failed to persist ${channel} rate-limit state after ${attempts} attempts; observed HTTP status ${observedStatus}.`,
    );
  }
}

export interface RateLimitReceiptEntry {
  minIntervalMs?: number | undefined;
  baseDelayMs?: number | undefined;
  maxDelayMs?: number | undefined;
  maxRetries?: number | undefined;
}

export interface RateLimitReceiptPayload {
  schemaVersion: 1;
  source: RateLimitPolicySource;
  confidence: RateLimitConfidence;
  observedAt?: string | undefined;
  expiresAt?: string | undefined;
  note?: string | undefined;
  read?: RateLimitReceiptEntry | undefined;
  write?: RateLimitReceiptEntry | undefined;
}

export interface RateLimitObservationInput {
  status: number;
  headers?: { get(name: string): string | null } | undefined;
  endpointClass: RateLimitChannel;
  observedAtMs?: number | undefined;
  networkError?: boolean | undefined;
}

const DEFAULT_CHANNELS: Record<RateLimitChannel, RateLimitClassPolicy> = {
  read: {
    minIntervalMs: 10000,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    maxRetries: 2,
  },
  write: {
    minIntervalMs: 15000,
    baseDelayMs: 3000,
    maxDelayMs: 30000,
    maxRetries: 0,
  },
};

const DEFAULT_STATE: Omit<
  RateLimitRuntimeState,
  "schemaVersion" | "updatedAt" | "source" | "confidence" | "policyObservedAt"
> = {
  read: {
    ...DEFAULT_CHANNELS.read,
    runtime: {
      nextAllowedAtMs: Date.now(),
      cooldownUntilMs: 0,
      consecutiveFailureCount: 0,
      lastObservedAtMs: Date.now(),
    },
  },
  write: {
    ...DEFAULT_CHANNELS.write,
    runtime: {
      nextAllowedAtMs: Date.now(),
      cooldownUntilMs: 0,
      consecutiveFailureCount: 0,
      lastObservedAtMs: Date.now(),
    },
  },
};

export function rateLimitStatePath(): string {
  return `${stateDir()}/rate-limit.json`;
}

export function defaultRateLimitRuntimeState(): RateLimitRuntimeState {
  return {
    schemaVersion: 1,
    source: "default",
    confidence: "low",
    updatedAt: new Date().toISOString(),
    policyObservedAt: new Date().toISOString(),
    ...DEFAULT_STATE,
  };
}

export async function createRateLimitController(
  statePath?: string,
  options: RateLimitPersistenceOptions = {},
): Promise<RateLimitController> {
  const filePath = statePath ?? rateLimitStatePath();
  const state = await loadRateLimitState(filePath);
  const readGovernor = new RateLimitGovernor(state, "read");
  const writeGovernor = new RateLimitGovernor(state, "write");
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 25;
  const save = options.save ?? saveRateLimitState;
  const sleep = options.sleep ?? delayPersistenceRetry;
  return {
    state,
    readGovernor,
    writeGovernor,
    async persist(context) {
      let lastError: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
          await save(state, filePath);
          return;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) await sleep(baseDelayMs * 2 ** attempt);
        }
      }
      throw new RateLimitStatePersistenceError(
        context.channel,
        context.observedStatus,
        maxRetries + 1,
        filePath,
        lastError,
      );
    },
  };
}

async function delayPersistenceRetry(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function toRateLimitStatusReport(state: RateLimitRuntimeState): RateLimitStatusReport {
  const now = Date.now();

  return {
    schemaVersion: 1,
    source: state.source,
    confidence: state.confidence,
    updatedAt: state.updatedAt,
    observedAt: state.policyObservedAt,
    expiresAt: state.policyExpiresAt,
    note: state.note,
    channels: {
      read: {
        minIntervalMs: state.read.minIntervalMs,
        baseDelayMs: state.read.baseDelayMs,
        maxDelayMs: state.read.maxDelayMs,
        maxRetries: state.read.maxRetries,
        nextAllowedInMs: Math.max(0, state.read.runtime.nextAllowedAtMs - now),
        cooldownInMs: Math.max(0, state.read.runtime.cooldownUntilMs - now),
      },
      write: {
        minIntervalMs: state.write.minIntervalMs,
        baseDelayMs: state.write.baseDelayMs,
        maxDelayMs: state.write.maxDelayMs,
        maxRetries: state.write.maxRetries,
        nextAllowedInMs: Math.max(0, state.write.runtime.nextAllowedAtMs - now),
        cooldownInMs: Math.max(0, state.write.runtime.cooldownUntilMs - now),
      },
    },
    metadata: {
      lastObserved: {
        read: {
          lastStatus: state.read.runtime.lastStatus,
          lastObservedAt: state.read.runtime.lastObservedAtMs
            ? new Date(state.read.runtime.lastObservedAtMs).toISOString()
            : undefined,
          retryAfterMs: state.read.runtime.lastRetryAfterMs,
          consecutiveFailureCount: state.read.runtime.consecutiveFailureCount,
        },
        write: {
          lastStatus: state.write.runtime.lastStatus,
          lastObservedAt: state.write.runtime.lastObservedAtMs
            ? new Date(state.write.runtime.lastObservedAtMs).toISOString()
            : undefined,
          retryAfterMs: state.write.runtime.lastRetryAfterMs,
          consecutiveFailureCount: state.write.runtime.consecutiveFailureCount,
        },
      },
      headers: {
        read: state.read.runtime.lastRateLimitHeaders,
        write: state.write.runtime.lastRateLimitHeaders,
      },
    },
  };
}

export function parseRetryAfterHeader(
  value: string | undefined,
  nowMs: number,
): number | undefined {
  if (!value) return undefined;

  const raw = Number(value);
  if (Number.isFinite(raw) && raw >= 0) {
    return Math.max(0, Math.ceil(raw * 1000));
  }

  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    return Math.max(0, parsed - nowMs);
  }

  return undefined;
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500 || status === 0;
}

export function parseRateLimitReceipt(raw: string): RateLimitReceiptPayload | undefined {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRateLimitReceiptPayload(parsed)) {
      return undefined;
    }
    if (parsed.read === undefined && parsed.write === undefined) {
      return undefined;
    }

    return {
      schemaVersion: 1,
      source: parsed.source,
      confidence: parsed.confidence,
      observedAt: normalizeReceiptStringField(parsed.observedAt),
      expiresAt: normalizeReceiptStringField(parsed.expiresAt),
      note: normalizeReceiptStringField(parsed.note),
      read: normalizeReceiptEntry(parsed.read),
      write: normalizeReceiptEntry(parsed.write),
    };
  } catch {
    return undefined;
  }
}

export function applyRateLimitReceipt(
  current: RateLimitRuntimeState,
  receipt: RateLimitReceiptPayload,
): RateLimitRuntimeState | undefined {
  const next = structuredClone(current);
  const readChanges = receipt.read ? normalizeReceiptEntry(receipt.read) : undefined;
  const writeChanges = receipt.write ? normalizeReceiptEntry(receipt.write) : undefined;
  if (!readChanges && !writeChanges) {
    return undefined;
  }

  if (readChanges) {
    next.read = applyReceiptToChannel(next.read, readChanges);
  }

  if (writeChanges) {
    next.write = applyReceiptToChannel(next.write, writeChanges);
  }

  next.source = receipt.source;
  next.confidence = receipt.confidence;
  next.note = receipt.note;
  next.policyObservedAt = receipt.observedAt ?? new Date().toISOString();
  next.policyExpiresAt = receipt.expiresAt;
  next.updatedAt = new Date().toISOString();
  next.read.runtime = clampRuntimeWindow(next.read.runtime);
  next.write.runtime = clampRuntimeWindow(next.write.runtime);

  return next;
}

export async function loadRateLimitState(path?: string): Promise<RateLimitRuntimeState> {
  const statePath = path ?? rateLimitStatePath();

  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isRateLimitState(parsed)) {
      return defaultRateLimitRuntimeState();
    }

    const candidate = parsed as RateLimitRuntimeState;
    return {
      ...defaultRateLimitRuntimeState(),
      ...candidate,
      source: candidate.source ?? "default",
      confidence: candidate.confidence ?? "low",
      policyObservedAt:
        candidate.policyObservedAt ?? candidate.updatedAt ?? new Date().toISOString(),
      read: {
        ...candidate.read,
        runtime: {
          ...candidate.read.runtime,
          lastObservedAtMs: candidate.read.runtime.lastObservedAtMs || Date.now(),
        },
      },
      write: {
        ...candidate.write,
        runtime: {
          ...candidate.write.runtime,
          lastObservedAtMs: candidate.write.runtime.lastObservedAtMs || Date.now(),
        },
      },
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return defaultRateLimitRuntimeState();
    }

    throw error;
  }
}

export async function saveRateLimitState(
  state: RateLimitRuntimeState,
  path?: string,
): Promise<void> {
  const normalized = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(dirname(path ?? rateLimitStatePath()), { recursive: true });
  await writeFile(path ?? rateLimitStatePath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

export class RateLimitGovernor {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly state: RateLimitRuntimeState,
    private readonly channel: RateLimitChannel,
  ) {}

  async acquire(): Promise<void> {
    return this.serialized(async () => {
      const runtime = this.channel === "read" ? this.state.read.runtime : this.state.write.runtime;
      const configured = this.channel === "read" ? this.state.read : this.state.write;
      const now = Date.now();
      const releaseAt = Math.max(runtime.nextAllowedAtMs, runtime.cooldownUntilMs);
      if (releaseAt > now) {
        await delay(releaseAt - now);
      }

      runtime.nextAllowedAtMs = Date.now() + configured.minIntervalMs;
      runtime.lastObservedAtMs = Date.now();
    });
  }

  async noteResponse(input: RateLimitObservationInput): Promise<void> {
    return this.serialized(async () => {
      const runtime = this.channel === "read" ? this.state.read.runtime : this.state.write.runtime;
      const configured = this.channel === "read" ? this.state.read : this.state.write;
      const now = input.observedAtMs ?? Date.now();
      const status = input.status;
      runtime.lastObservedAtMs = now;
      runtime.lastStatus = status;
      runtime.lastEndpointClass = input.endpointClass;
      runtime.lastRateLimitHeaders = parseRateLimitHeaders(input.headers);

      if (!isRetryableStatus(status)) {
        runtime.consecutiveFailureCount = Math.max(0, runtime.consecutiveFailureCount - 1);
        return;
      }

      runtime.consecutiveFailureCount += 1;
      runtime.consecutiveFailureCount = Math.min(
        runtime.consecutiveFailureCount,
        configured.maxRetries + 1,
      );

      const retryAfter = input.networkError
        ? undefined
        : parseRetryAfterHeader(
            headerValue(input.headers?.get("retry-after")) ??
              headerValue(input.headers?.get("Retry-After")),
            now,
          );
      const backoff = boundedJitter(
        configured.baseDelayMs,
        configured.maxDelayMs,
        runtime.consecutiveFailureCount - 1,
      );
      const delayMs = Math.max(retryAfter ?? 0, backoff);
      runtime.lastRetryAfterMs = retryAfter ?? backoff;

      if (status === 429 || status >= 500) {
        runtime.cooldownUntilMs = Math.max(
          runtime.cooldownUntilMs,
          now + delayMs,
          now + Math.min(delayMs, configured.maxDelayMs),
        );
        runtime.nextAllowedAtMs = Math.max(runtime.nextAllowedAtMs, runtime.cooldownUntilMs);
        this.state.source = input.networkError ? this.state.source : "server-header";
        this.state.confidence = input.networkError ? this.state.confidence : "medium";
        this.state.policyObservedAt = new Date(now).toISOString();
        this.state.updatedAt = new Date(now).toISOString();
      }
    });
  }

  getRetryPolicy(): RateLimitClassPolicy {
    const configured = this.channel === "read" ? this.state.read : this.state.write;
    return {
      minIntervalMs: configured.minIntervalMs,
      baseDelayMs: configured.baseDelayMs,
      maxDelayMs: configured.maxDelayMs,
      maxRetries: configured.maxRetries,
    };
  }

  nextRetryDelay(attempt: number): number {
    const configured = this.channel === "read" ? this.state.read : this.state.write;
    return boundedJitter(configured.baseDelayMs, configured.maxDelayMs, attempt);
  }

  private async serialized<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    const next = previous.then(operation, operation);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

function normalizeReceiptEntry(raw: unknown): RateLimitReceiptEntry | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as Record<string, unknown>;
  const entry: RateLimitReceiptEntry = {};

  if ("minIntervalMs" in candidate && isFinitePositiveInteger(candidate.minIntervalMs as number)) {
    entry.minIntervalMs = candidate.minIntervalMs as number;
  }
  if ("baseDelayMs" in candidate && isFinitePositiveInteger(candidate.baseDelayMs as number)) {
    entry.baseDelayMs = candidate.baseDelayMs as number;
  }
  if ("maxDelayMs" in candidate && isFinitePositiveInteger(candidate.maxDelayMs as number)) {
    entry.maxDelayMs = candidate.maxDelayMs as number;
  }
  if ("maxRetries" in candidate && isFinitePositiveInteger(candidate.maxRetries as number)) {
    entry.maxRetries = candidate.maxRetries as number;
  }

  return Object.keys(entry).length ? entry : undefined;
}

function parseRateLimitHeaders(
  headers: { get(name: string): string | null } | undefined,
): RateLimitHeaderSnapshot | undefined {
  if (!headers) return undefined;
  const snapshot: RateLimitHeaderSnapshot = {};
  const limit =
    parseHeaderInt(headers.get("ratelimit-limit")) ??
    parseHeaderInt(headers.get("Rate-Limit-Limit"));
  const remaining =
    parseHeaderInt(headers.get("ratelimit-remaining")) ??
    parseHeaderInt(headers.get("Rate-Limit-Remaining"));
  const reset =
    parseHeaderInt(headers.get("ratelimit-reset")) ??
    parseHeaderInt(headers.get("Rate-Limit-Reset"));
  if (limit !== undefined) snapshot.rateLimitLimit = limit;
  if (remaining !== undefined) snapshot.rateLimitRemaining = remaining;
  if (reset !== undefined) snapshot.rateLimitResetMs = reset;

  const xLimit =
    parseHeaderInt(headers.get("x-ratelimit-limit")) ??
    parseHeaderInt(headers.get("X-RateLimit-Limit"));
  const xRemaining =
    parseHeaderInt(headers.get("x-ratelimit-remaining")) ??
    parseHeaderInt(headers.get("X-RateLimit-Remaining"));
  const xReset =
    parseHeaderInt(headers.get("x-ratelimit-reset")) ??
    parseHeaderInt(headers.get("X-RateLimit-Reset"));
  if (xLimit !== undefined) snapshot.xRateLimitLimit = xLimit;
  if (xRemaining !== undefined) snapshot.xRateLimitRemaining = xRemaining;
  if (xReset !== undefined) snapshot.xRateLimitResetMs = xReset;

  const retryAfterHeader = parseRetryAfterHeader(
    headerValue(headers.get("retry-after")) ?? headerValue(headers.get("Retry-After")),
    Date.now(),
  );
  if (retryAfterHeader !== undefined) snapshot.retryAfterMs = retryAfterHeader;

  return Object.keys(snapshot).length ? snapshot : undefined;
}

function parseHeaderInt(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

function headerValue(value: string | null | undefined): string | undefined {
  return value === null ? undefined : value;
}

function normalizeReceiptStringField(value: unknown): string | undefined {
  return typeof value === "string" && value.length ? value : undefined;
}

function applyReceiptToChannel(
  channel: RateLimitChannelState,
  entry: RateLimitReceiptEntry,
): RateLimitChannelState {
  return {
    ...channel,
    minIntervalMs: entry.minIntervalMs ?? channel.minIntervalMs,
    baseDelayMs: entry.baseDelayMs ?? channel.baseDelayMs,
    maxDelayMs: entry.maxDelayMs ?? channel.maxDelayMs,
    maxRetries: entry.maxRetries ?? channel.maxRetries,
  };
}

function clampRuntimeWindow(runtime: RateLimitChannelRuntime): RateLimitChannelRuntime {
  const now = Date.now();
  return {
    ...runtime,
    nextAllowedAtMs: Math.max(now, runtime.nextAllowedAtMs),
    cooldownUntilMs: Math.max(0, runtime.cooldownUntilMs),
  };
}

function isRateLimitReceiptPayload(value: unknown): value is RateLimitReceiptPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.source === "string" &&
    (candidate.source === "default" ||
      candidate.source === "operator" ||
      candidate.source === "server-header") &&
    typeof candidate.confidence === "string" &&
    (candidate.confidence === "low" ||
      candidate.confidence === "medium" ||
      candidate.confidence === "high")
  );
}

function isFinitePositiveInteger(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value >= 0 && Number.isFinite(value);
}

function isRateLimitState(value: unknown): value is RateLimitRuntimeState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.schemaVersion === 1 &&
    candidate.read instanceof Object &&
    candidate.write instanceof Object &&
    (candidate.source === "default" ||
      candidate.source === "operator" ||
      candidate.source === "server-header")
  );
}

function boundedJitter(baseDelayMs: number, maxDelayMs: number, attempt: number): number {
  const backoff = baseDelayMs * 2 ** attempt;
  const jitter = Math.random() * baseDelayMs;
  return Math.min(backoff + jitter, maxDelayMs);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
