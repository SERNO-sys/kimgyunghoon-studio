import type { RetryPolicy } from './types';

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 4000,
};

/**
 * Returns true when an error is transient and worth retrying: rate limits,
 * provider 5xx errors, and network-level failures. Schema/validation errors
 * are NOT transient and must not be retried here.
 */
export function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|rate.?limit|quota|5\d{2}|timeout|timed out|network|fetch failed|ECONNRESET|unavailable|overloaded/i.test(
    message
  );
}

function backoffDelay(attempt: number, policy: RetryPolicy): number {
  const exponential = policy.baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.random() * policy.baseDelayMs;
  return Math.min(exponential + jitter, policy.maxDelayMs);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `operation`, retrying transient failures with exponential backoff and
 * jitter. `onRetry` is invoked before each retry attempt.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<{ result: T; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return { result: await operation(), attempts: attempt };
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === policy.maxAttempts;
      if (isLastAttempt || !isTransientError(error)) {
        throw error;
      }
      onRetry?.(attempt, error);
      await sleep(backoffDelay(attempt, policy));
    }
  }
  throw lastError;
}
