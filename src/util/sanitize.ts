// F-01 / F-11 text
//
// text
// - text"text"texttoken / key text
// - text / text text F-11 text
// - text string text typo text fallbacktext
//
// text
// 1. Telegram text URLtexthttps://api.telegram.org/file/bot<token>/<file_path>
//    botToken text "<digits>:<base58-ish>"text "bot<token>/" text
// 2. Cursor API keytextcrsr_<hex>texthex text text 32text

// Telegram bot URL text tokentext
// - bot text tokentexttoken text`-`text`:`text `/`
// - text "bot<token>/" text "bot***/"
const TELEGRAM_BOT_URL_RE = /bot[A-Za-z0-9_:-]{20,}\//g;

// Cursor API keytextcrsr_ + 16 text hex / base62 text
// text "crsr_<key>" text "crsr_***"
const CURSOR_API_KEY_RE = /crsr_[A-Za-z0-9]{16,}/g;

export function sanitizeForOutput(s: string): string {
  if (typeof s !== "string") return "";
  if (s.length === 0) return "";
  return s
    .replace(TELEGRAM_BOT_URL_RE, "bot***/")
    .replace(CURSOR_API_KEY_RE, "crsr_***");
}
