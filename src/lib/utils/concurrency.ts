/**
 * Simple concurrency limiter for batching GitHub API calls.
 * No external dependencies — uses a basic semaphore pattern
 * to cap in-flight promises and reduce rate-limit pressure.
 */

/**
 * Runs an array of async tasks with at most `limit` concurrent executions.
 * Returns results in the same order as the input items.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
