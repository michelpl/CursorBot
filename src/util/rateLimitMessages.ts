function renderRetryAfter(retryMs: number): string {
  const seconds = Math.max(0.1, retryMs / 1000);
  return `${seconds.toFixed(1)}s`;
}

export function rateLimitedMessageText(retryMs: number): string {
  return `Muitas mensagens. Tente novamente em ${renderRetryAfter(retryMs)}.`;
}

export function rateLimitedSessionCreateText(retryMs: number): string {
  return `Limite de criação de sessão atingido. Tente novamente em ${renderRetryAfter(retryMs)}.`;
}

/** @deprecated use rateLimitedSessionCreateText */
export const rateLimitedAgentCreateText = rateLimitedSessionCreateText;
