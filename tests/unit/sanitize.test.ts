import { describe, it, expect } from "vitest";
import { sanitizeForOutput } from "../../src/util/sanitize.js";

// Synthetic fixtures only — never real credentials.
const SYNTHETIC_BOT_TOKEN = "0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA00000";
const SYNTHETIC_BOT_TOKEN_FRAGMENT = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA00000";
const SYNTHETIC_CURSOR_KEY =
  "crsr_0000111122223333444455556666777788889999aaaabbbbccccddddeeee";
const SYNTHETIC_CURSOR_KEY_FRAGMENT = "0000111122223333";
const SYNTHETIC_CURSOR_KEY_DASH =
  "key_0000111122223333444455556666777788889999";

describe("sanitizeForOutput (F-01 / F-11)", () => {
  it("redacts Telegram file URL bot tokens", () => {
    const input = `fetch failed: https://api.telegram.org/file/bot${SYNTHETIC_BOT_TOKEN}/photos/file_1.jpg`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_BOT_TOKEN);
    expect(out).not.toContain(SYNTHETIC_BOT_TOKEN_FRAGMENT);
    expect(out).toContain("bot***/");
    expect(out).toContain("https://api.telegram.org/file/");
  });

  it("redacts bot tokens embedded in request URLs", () => {
    const input = `request to https://api.telegram.org/file/bot${SYNTHETIC_BOT_TOKEN}/abc.jpg failed`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_BOT_TOKEN);
    expect(out).toContain("bot***/");
  });

  it("redacts bare BotFather tokens outside URLs", () => {
    const input = `config dump: telegram.botToken=${SYNTHETIC_BOT_TOKEN}`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_BOT_TOKEN);
    expect(out).not.toContain(SYNTHETIC_BOT_TOKEN_FRAGMENT);
    expect(out).toContain("***BOT_TOKEN***");
  });

  it("leaves the word bot alone", () => {
    const input = "the bot started";
    expect(sanitizeForOutput(input)).toBe("the bot started");
  });

  it("redacts Cursor API key crsr_<…>", () => {
    const input = `config dump: cursor.apiKey=${SYNTHETIC_CURSOR_KEY}`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_CURSOR_KEY);
    expect(out).not.toContain(SYNTHETIC_CURSOR_KEY_FRAGMENT);
    expect(out).toContain("***CURSOR_KEY***");
  });

  it("redacts Cursor API key key_<…>", () => {
    const input = `export CURSOR_API_KEY=${SYNTHETIC_CURSOR_KEY_DASH}`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_CURSOR_KEY_DASH);
    expect(out).toContain("***CURSOR_KEY***");
  });

  it("redacts Cursor keys inside URLs", () => {
    const input = `see https://example.com/api?key=${SYNTHETIC_CURSOR_KEY}`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_CURSOR_KEY);
    expect(out).toContain("***CURSOR_KEY***");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeForOutput("")).toBe("");
  });

  it("preserves normal Telegram error text", () => {
    const input = "Telegram text (file_id=AgACAgIAAxkBAAOTaO...)";
    expect(sanitizeForOutput(input)).toBe(input);
  });

  it("does not redact SSH paths", () => {
    const input = "open /Users/me/.ssh/id_rsa failed";
    expect(sanitizeForOutput(input)).toBe(input);
  });

  it("coerces non-strings to empty", () => {
    expect(sanitizeForOutput(undefined as unknown as string)).toBe("");
    expect(sanitizeForOutput(null as unknown as string)).toBe("");
  });
});
