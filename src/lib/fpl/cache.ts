type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export type CachedWithTtlResult<T> = {
  value: T
  ttlMs: number
}

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

/**
 * In-memory TTL cache with in-flight request deduplication.
 * Per Nitro server instance — not shared across horizontal scale-out.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  return cachedWithTtl(key, async () => ({
    value: await fetcher(),
    ttlMs,
  }))
}

/**
 * Like `cached`, but the fetcher chooses the TTL (e.g. shorter while live).
 */
export async function cachedWithTtl<T>(
  key: string,
  fetcher: () => Promise<CachedWithTtlResult<T>>
): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T
  }

  const pending = inflight.get(key)
  if (pending) {
    return pending as Promise<T>
  }

  const promise = fetcher()
    .then(({ value, ttlMs }) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}

/** Test-only helpers */
export function clearFplCache(): void {
  store.clear()
  inflight.clear()
}

export function getFplCacheEntry(key: string): CacheEntry<unknown> | undefined {
  return store.get(key)
}
