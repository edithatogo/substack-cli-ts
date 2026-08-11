export interface SimulationEvent {
  attempt: number;
  status: number;
  atMs: number;
  retryDelayMs: number;
}

export interface SimulationResult {
  seed: number;
  status: "succeeded" | "exhausted";
  elapsedMs: number;
  events: SimulationEvent[];
}

export type PublishMode = "draft" | "publish" | "schedule";

export interface PublishGateResult {
  seed: number;
  mode: PublishMode;
  status: "allowed" | "blocked" | "dry-run";
  reason?: string;
}

export function simulatePublishGate(options: {
  seed: number;
  mode: PublishMode;
  confirmed: boolean;
  dryRun: boolean;
}): PublishGateResult {
  const { seed, mode, confirmed, dryRun } = options;
  if (!Number.isInteger(seed)) {
    throw new Error("Publish-gate simulation requires an integer seed.");
  }
  if (dryRun) {
    return { seed, mode, status: "dry-run", reason: "dry-run does not mutate Substack" };
  }
  if ((mode === "publish" || mode === "schedule") && !confirmed) {
    return {
      seed,
      mode,
      status: "blocked",
      reason: "Publishing and scheduling require --yes. Run with --dry-run first.",
    };
  }
  return { seed, mode, status: "allowed" };
}

export function simulateRetrySchedule(
  seed: number,
  statuses: readonly number[],
  maxAttempts: number,
): SimulationResult {
  if (!Number.isInteger(seed) || !Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("Simulation requires an integer seed and at least one attempt.");
  }

  let state = seed >>> 0;
  let elapsedMs = 0;
  const events: SimulationEvent[] = [];

  for (let index = 0; index < Math.min(statuses.length, maxAttempts); index += 1) {
    const status = statuses[index];
    if (status === undefined) break;

    const succeeded = status >= 200 && status < 300;
    state = xorshift32(state || 0x9e3779b9);
    const retryDelayMs = succeeded ? 0 : 100 * 2 ** index + (state % 31);
    events.push({ attempt: index + 1, status, atMs: elapsedMs, retryDelayMs });

    if (succeeded) {
      return { seed, status: "succeeded", elapsedMs, events };
    }
    elapsedMs += retryDelayMs;
  }

  return { seed, status: "exhausted", elapsedMs, events };
}

function xorshift32(value: number): number {
  let next = value >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}
