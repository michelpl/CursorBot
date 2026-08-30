import { describe, it, expect } from "vitest";
import { RateLimiter } from "../../src/core/rateLimit/RateLimiter.js";

// F-06 PR btextRateLimiter text bucket text
// - (userId, key) text
// - text key text
// - DENY text retryAfterMs > 0
// - text key text ALLOWtext
// - LRU evict text
describe("RateLimiter", () => {
  it("text (userId, key) text", () => {
    let t = 0;
    const lim = new RateLimiter({
      buckets: {
        msg: { capacity: 1, refillPerSec: 1 },
      },
      now: () => t,
    });
    expect(lim.check(1, "msg").allowed).toBe(true);
    expect(lim.check(1, "msg").allowed).toBe(false);
    // text user text
    expect(lim.check(2, "msg").allowed).toBe(true);
  });

  it("text key text", () => {
    const lim = new RateLimiter({
      buckets: {
        msg: { capacity: 1, refillPerSec: 1 },
        agentCreate: { capacity: 1, refillPerSec: 1 },
      },
      now: () => 0,
    });
    expect(lim.check(1, "msg").allowed).toBe(true);
    expect(lim.check(1, "agentCreate").allowed).toBe(true);
    expect(lim.check(1, "msg").allowed).toBe(false);
    expect(lim.check(1, "agentCreate").allowed).toBe(false);
  });

  it("DENY text retryAfterMs > 0", () => {
    let t = 0;
    const lim = new RateLimiter({
      buckets: { msg: { capacity: 1, refillPerSec: 2 } },
      now: () => t,
    });
    expect(lim.check(1, "msg").allowed).toBe(true);
    const r = lim.check(1, "msg");
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("text key text ALLOWtext", () => {
    const lim = new RateLimiter({
      buckets: { msg: { capacity: 1, refillPerSec: 1 } },
      now: () => 0,
    });
    expect(lim.check(1, "unknown").allowed).toBe(true);
  });

  it("LRU evicttext maxBuckets text", () => {
    let t = 0;
    const lim = new RateLimiter({
      // refill text evict text take text
      buckets: { msg: { capacity: 1, refillPerSec: 0.0001 } },
      maxBuckets: 2,
      now: () => t,
    });
    lim.check(1, "msg"); // bucket1texttake 1text 0
    t = 1;
    lim.check(2, "msg"); // bucket2texttake 1text 0
    t = 2;
    lim.check(3, "msg"); // bucket3 text text evict text bucket1
    // bucket1 text evicttextuser 1 text text ALLOW
    expect(lim.check(1, "msg").allowed).toBe(true);
  });
});
