import { describe, it, expect } from "vitest";
import { TokenBucket } from "../../src/core/rateLimit/TokenBucket.js";

// F-06 PR atextTokenBucket text
// - text/text take text
// - refill text capacity
// - inspect text
// - timeUntilNext text
describe("TokenBucket", () => {
  it("texttake(1) text", () => {
    const b = new TokenBucket({ capacity: 4, refillPerSec: 2, now: () => 0 });
    expect(b.take(1)).toBe(true);
  });

  it("text take text false text timeUntilNext text", () => {
    let t = 0;
    const b = new TokenBucket({ capacity: 2, refillPerSec: 2, now: () => t });
    expect(b.take(1)).toBe(true);
    expect(b.take(1)).toBe(true);
    expect(b.take(1)).toBe(false);
    // textrefill text 2/s text 0.5s text 1 token
    expect(b.timeUntilNext()).toBeCloseTo(500, 0);
  });

  it("text refill text capacity", () => {
    let t = 0;
    const b = new TokenBucket({ capacity: 4, refillPerSec: 2, now: () => t });
    expect(b.take(4)).toBe(true);
    expect(b.take(1)).toBe(false);
    // text 10s text text capacitytext clamp text (4)
    t = 10_000;
    expect(b.take(4)).toBe(true);
    expect(b.take(1)).toBe(false);
  });

  it("inspect() text token", () => {
    const b = new TokenBucket({ capacity: 3, refillPerSec: 1, now: () => 0 });
    expect(b.inspect()).toBe(3);
    expect(b.inspect()).toBe(3);
    expect(b.take(1)).toBe(true);
    expect(b.inspect()).toBe(2);
  });

  it("retryAfterMs textrefill 1/stext 0.4 token text 400ms", () => {
    let t = 0;
    const b = new TokenBucket({ capacity: 1, refillPerSec: 1, now: () => t });
    expect(b.take(1)).toBe(true);
    // text 0.6s text text 0.6 tokentext 0.4 text 400ms
    t = 600;
    expect(b.take(1)).toBe(false);
    expect(b.timeUntilNext()).toBeCloseTo(400, 0);
  });
});
