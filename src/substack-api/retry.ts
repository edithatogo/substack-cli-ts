export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /**
   * Optional randomness source for jitter and delay spread.
   * Useful for deterministic tests and deterministic retry policy traces.
   */
  randomizer?: () => number;
  /**
   * Optional idempotency hint for non-idempotent mutation endpoints.
   * When absent, POST retrying is disabled to avoid uncertain replays.
   */
  idempotencyKey?: string | undefined;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },
): Promise<T> {
  const randomizer = options.randomizer ?? Math.random;
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.maxRetries) {
        const delay = computeRetryDelay(
          options.baseDelayMs,
          options.maxDelayMs,
          attempt,
          randomizer,
        );
        console.warn(
          `Request failed (attempt ${attempt + 1}/${options.maxRetries + 1}), retrying in ${delay}ms: ${error instanceof Error ? error.message : String(error)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

function computeRetryDelay(
  baseDelayMs: number,
  maxDelayMs: number,
  attempt: number,
  randomizer: () => number,
): number {
  const boundedAttemptDelay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
  const normalizedRandom = Math.min(Math.max(randomizer(), 0), 1);
  const jitter = normalizedRandom * baseDelayMs;
  return Math.min(boundedAttemptDelay + jitter, maxDelayMs);
}
