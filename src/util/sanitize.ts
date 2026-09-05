// Redact secrets before they reach Telegram, logs, or other sinks.
//
// Layers:
// 1. Telegram file URLs: https://api.telegram.org/file/bot<token>/<path>
// 2. Bare Telegram bot tokens: "<digits>:<secret>"
// 3. Cursor API keys: crsr_<…> and key_<…>

/** Matches `bot<token>/` in Telegram Bot API file URLs. */
const TELEGRAM_BOT_URL_RE = /bot[A-Za-z0-9_:-]{20,}\//g;

/**
 * Bare Bot API tokens (BotFather format).
 * Conservative length floor avoids mangling innocuous `123:abc` fixtures in tests
 * while catching real tokens (~35+ chars after the colon).
 */
const TELEGRAM_BOT_TOKEN_RE = /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/g;

/** Cursor API key forms used by the SDK / dashboard. */
const CURSOR_API_KEY_RE = /\b(?:crsr_|key_)[A-Za-z0-9_-]{16,}\b/g;

export function sanitizeForOutput(s: string): string {
  if (typeof s !== "string") return "";
  if (s.length === 0) return "";
  return s
    .replace(TELEGRAM_BOT_URL_RE, "bot***/")
    .replace(TELEGRAM_BOT_TOKEN_RE, "***BOT_TOKEN***")
    .replace(CURSOR_API_KEY_RE, "***CURSOR_KEY***");
}
