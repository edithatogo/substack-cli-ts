export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.maxRetries) {
        const delay = Math.min(options.baseDelayMs * 2 ** attempt, options.maxDelayMs);
        console.warn(
          `Request failed (attempt ${attempt + 1}/${options.maxRetries + 1}), retrying in ${delay}ms: ${error instanceof Error ? error.message : String(error)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
