// F-06seconds retryAfterMs text
// text util text messenger / orchestrator text

// text"X text"text 0.1stext 0 text/text
function renderRetryAfter(retryMs: number): string {
  const seconds = Math.max(0.1, retryMs / 1000);
  return `${seconds.toFixed(1)} text`;
}

// messenger textonText / onImageGroup text
export function rateLimitedMessageText(retryMs: number): string {
  return `text ${renderRetryAfter(retryMs)} text`;
}

// agent.create textrunInternal catch text renderer.finalize
export function rateLimitedAgentCreateText(retryMs: number): string {
  return `text agent text ${renderRetryAfter(retryMs)} text`;
}
