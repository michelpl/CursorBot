import { TokenBucket } from "./TokenBucket.js";

// F-06 PR btextRateLimiter text bucket text
// - text (userId, key) text TokenBucket
// - text options.buckets text key text"text"text ALLOW
// - text LRUtext lastUsedMs text evicttext idle bucket text

export interface BucketSpec {
  capacity: number;
  refillPerSec: number;
}

export interface RateLimiterOptions {
  // text key text bucket text key check() text ALLOW
  buckets: Record<string, BucketSpec>;
  // text (userId, key) text bucket text LRU evict
  maxBuckets?: number;
  now?: () => number;
}

export interface CheckResult {
  allowed: boolean;
  // ALLOW text 0textDENY text mstext bucket.timeUntilNexttext
  retryAfterMs: number;
}

export class RateLimiter {
  private readonly specs: Record<string, BucketSpec>;
  private readonly maxBuckets: number;
  private readonly now: () => number;
  // text Map text id text bucket textLRU text lastUsed Map text
  private readonly store = new Map<string, TokenBucket>();
  private readonly lastUsed = new Map<string, number>();

  constructor(opts: RateLimiterOptions) {
    this.specs = opts.buckets;
    this.maxBuckets = opts.maxBuckets ?? 1024;
    this.now = opts.now ?? Date.now;
  }

  // text tokentextALLOW textDENY text retryAfterMs text
  check(userId: number, key: string): CheckResult {
    const spec = this.specs[key];
    // text key text ALLOWtext key text"text"text
    if (!spec) return { allowed: true, retryAfterMs: 0 };

    const id = `${userId}::${key}`;
    let bucket = this.store.get(id);
    if (!bucket) {
      bucket = new TokenBucket({ ...spec, now: this.now });
      this.store.set(id, bucket);
      this.evictIfFull();
    }
    this.lastUsed.set(id, this.now());

    if (bucket.take(1)) return { allowed: true, retryAfterMs: 0 };
    return { allowed: false, retryAfterMs: bucket.timeUntilNext() };
  }

  // text LRUtext lastUsed text bucket text
  // text QPS textO(n) text maxBuckets text LinkedList text
  private evictIfFull(): void {
    if (this.store.size <= this.maxBuckets) return;
    let oldestId: string | undefined;
    let oldestT = Number.POSITIVE_INFINITY;
    for (const [id, t] of this.lastUsed) {
      if (t < oldestT) {
        oldestT = t;
        oldestId = id;
      }
    }
    if (oldestId) {
      this.store.delete(oldestId);
      this.lastUsed.delete(oldestId);
    }
  }
}
