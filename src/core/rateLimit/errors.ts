// F-06text
// text typed error text sentinel text instanceof text retryAfterMs text

export class RateLimitedError extends Error {
  constructor(
    public readonly key: string,
    public readonly retryAfterMs: number,
  ) {
    super(`rate limited: ${key}, retry in ${retryAfterMs}ms`);
    this.name = "RateLimitedError";
  }
}
