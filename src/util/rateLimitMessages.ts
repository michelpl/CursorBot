function renderRetryAfter(retryMs: number): string {
  const seconds = Math.max(0.1, retryMs / 1000);
  return `${seconds.toFixed(1)}s`;
}

export function rateLimitedMessageText(retryMs: number): string {
  return `Too many messages. Try again in ${renderRetryAfter(retryMs)}.`;
}

export function rateLimitedSessionCreateText(retryMs: number): string {
  return `Session-create limit reached. Try again in ${renderRetryAfter(retryMs)}.`;
}

/** @deprecated use rateLimitedSessionCreateText */
export const rateLimitedAgentCreateText = rateLimitedSessionCreateText;
