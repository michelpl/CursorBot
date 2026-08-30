// F-06 PR atextTokenBucket text
// - text = capacitytext = refillPerSec
// - text (tokens, lastRefillMs)text timer / text / text
// - text now() text

export interface TokenBucketOptions {
  // text token text"text"text
  capacity: number;
  // text
  refillPerSec: number;
  // text fake clocktext Date.now
  now?: () => number;
}

/**
 * text token-bucket text
 *
 * text
 * - text refill text take/inspect textlazytext
 *   text setInterval text timer text bucket text
 *   text GC text
 * - tokens textrefill text token/s text
 *   take(n) text"text text n"text
 */
export class TokenBucket {
  private readonly capacity: number;
  private readonly refillPerSec: number;
  private readonly now: () => number;
  private tokens: number;
  private lastRefillMs: number;

  constructor(opts: TokenBucketOptions) {
    this.capacity = opts.capacity;
    this.refillPerSec = opts.refillPerSec;
    this.now = opts.now ?? Date.now;
    this.tokens = opts.capacity;
    this.lastRefillMs = this.now();
  }

  // text token text clamp text capacity text
  private refill(): void {
    const t = this.now();
    const dt = (t - this.lastRefillMs) / 1000;
    if (dt <= 0) return;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + dt * this.refillPerSec,
    );
    this.lastRefillMs = t;
  }

  // text n text tokentext truetext false
  take(n = 1): boolean {
    this.refill();
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }

  // text token text refill text
  inspect(): number {
    this.refill();
    return this.tokens;
  }

  // text ms text take 1 text tokentext text 1 text 0
  timeUntilNext(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    const need = 1 - this.tokens;
    return Math.ceil((need / this.refillPerSec) * 1000);
  }
}
