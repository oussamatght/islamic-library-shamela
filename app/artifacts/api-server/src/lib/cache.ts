type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Returns a cached value for `key`, or computes and caches it via `loader`.
 *
 * Simple TTL cache (no eviction policy needed for a small number of Islamic
 * content collections). In-flight deduplication prevents stampedes when many
 * clients request the same fresh entry at once.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const existing = store.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Invalidates a cached key immediately (used after upstream auth changes). */
export function invalidateCache(key: string): void {
  store.delete(key);
  inFlight.delete(key);
}