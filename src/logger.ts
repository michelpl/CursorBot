import pino from "pino";
import { sanitizeForOutput } from "./util/sanitize.js";

// text redactSensitive text masktext
// text pino text redact text
const SENSITIVE_KEYS = new Set([
  "botToken",
  "apiKey",
  "TELEGRAM_BOT_TOKEN",
  "CURSOR_API_KEY",
  "token",
  "secret",
]);

// F-01 text string text sanitizeForOutputtext
// text Telegram bot token URL / Cursor API key text"text"text
// pino text redact text**text**text**text**text
// text
function sanitizeObjectStrings(obj: unknown): unknown {
  if (typeof obj === "string") return sanitizeForOutput(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObjectStrings);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = sanitizeObjectStrings(v);
    }
    return out;
  }
  return obj;
}

/**
 * text "***"text
 * text dump text
 */
export function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => redactSensitive(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k) ? "***" : redactSensitive(v);
    }
    return out as unknown as T;
  }
  return value;
}

// text logger text ndjsontext prettytext
//
// text
//   Layer Atextredact.pathstext masktext *.apiKey / *.botTokentext
//   Layer Btextformatters.log text sanitizeObjectStringstext token URLtext
//   Layer Ctext redactSensitive() textdump text
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "telegram.botToken",
      "cursor.apiKey",
      "*.botToken",
      "*.apiKey",
      "headers.authorization",
    ],
    censor: "***",
  },
  formatters: {
    // pino text log formattertext transporttext
    // text sanitizeObjectStrings text
    log: (obj) => sanitizeObjectStrings(obj) as Record<string, unknown>,
  },
  transport:
    process.env.NODE_ENV === "production" || !process.stdout.isTTY
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } },
});

export type Logger = typeof logger;
