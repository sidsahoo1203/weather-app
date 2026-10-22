/**
 * Small in-memory LRU cache with per-entry TTL and in-flight request
 * de-duplication, so concurrent callers for the same key share one upstream call.
 */
export class TtlCache {
  constructor({ max = 500 } = {}) {
    this.max = max;
    this.entries = new Map();
    this.inflight = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs) {
    this.entries.delete(key);
    this.entries.set(key, { value, expires: Date.now() + ttlMs });
    while (this.entries.size > this.max) {
      this.entries.delete(this.entries.keys().next().value);
    }
  }

  async wrap(key, ttlMs, producer) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    if (this.inflight.has(key)) return this.inflight.get(key);

    const pending = (async () => {
      try {
        const value = await producer();
        this.set(key, value, ttlMs);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, pending);
    return pending;
  }

  clear() {
    this.entries.clear();
    this.inflight.clear();
  }
}

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
