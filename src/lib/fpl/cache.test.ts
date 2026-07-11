import { afterEach, describe, expect, it, vi } from "vitest"

import { cached, clearFplCache, getFplCacheEntry } from "@/lib/fpl/cache"

afterEach(() => {
  clearFplCache()
  vi.restoreAllMocks()
})

describe("cached", () => {
  it("returns cached value within TTL", async () => {
    const fetcher = vi.fn().mockResolvedValue("value-a")

    await cached("key", 60_000, fetcher)
    const second = await cached("key", 60_000, fetcher)

    expect(second).toBe("value-a")
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("refetches after TTL expires", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(0))

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("stale")
      .mockResolvedValueOnce("fresh")

    await cached("key", 1_000, fetcher)
    vi.advanceTimersByTime(1_001)
    const second = await cached("key", 1_000, fetcher)

    expect(second).toBe("fresh")
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(getFplCacheEntry("key")?.value).toBe("fresh")

    vi.useRealTimers()
  })

  it("deduplicates in-flight requests for the same key", async () => {
    let resolveFetcher: (value: string) => void = () => {}
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetcher = resolve
        })
    )

    const first = cached("key", 60_000, fetcher)
    const second = cached("key", 60_000, fetcher)

    expect(fetcher).toHaveBeenCalledTimes(1)

    resolveFetcher("shared")
    await expect(Promise.all([first, second])).resolves.toEqual([
      "shared",
      "shared",
    ])
  })
})

describe("fplKeys", () => {
  it("sorts fixture event ids in query keys", async () => {
    const { fplKeys } = await import("@/lib/fpl/queries")

    expect(fplKeys.fixtures([3, 1, 2])).toEqual(["fpl", "fixtures", [1, 2, 3]])
  })

  it("versions the bootstrap query key when element fields expand", async () => {
    const { fplKeys } = await import("@/lib/fpl/queries")

    expect(fplKeys.bootstrap()).toEqual(["fpl", "bootstrap", "v3"])
  })
})
