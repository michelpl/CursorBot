import { describe, it, expect } from "vitest";
import { sanitizeForOutput } from "../../src/util/sanitize.js";

// text "token" / "key" text**text**text Telegram bot
// text Cursor API key text
//
// text tokentextbot<digits>:<base58-ish>text text 20text
// text key  textcrsr_<hex-ish>text text 16text
//
// textv0.1.0 text token text fixturetext
// text commit text git text"text"text
// text revoke / rotate text
const SYNTHETIC_BOT_TOKEN = "0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA00000";
const SYNTHETIC_BOT_TOKEN_FRAGMENT = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA00000";
const SYNTHETIC_CURSOR_KEY =
  "crsr_0000111122223333444455556666777788889999aaaabbbbccccddddeeee";
const SYNTHETIC_CURSOR_KEY_FRAGMENT = "0000111122223333";

describe("sanitizeForOutput (F-01 / F-11)", () => {
  // --- F-01 text ---

  it("text Telegram text URL text botTokentextbot<token>/...", () => {
    const input = `fetch failed: https://api.telegram.org/file/bot${SYNTHETIC_BOT_TOKEN}/photos/file_1.jpg`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_BOT_TOKEN);
    expect(out).not.toContain(SYNTHETIC_BOT_TOKEN_FRAGMENT);
    expect(out).toContain("bot***/");
    expect(out).toContain("https://api.telegram.org/file/");
  });

  it("text botToken text pathtext", () => {
    const input = `request to https://api.telegram.org/file/bot${SYNTHETIC_BOT_TOKEN}/abc.jpg failed`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_BOT_TOKEN);
    expect(out).toContain("bot***/");
  });

  it("text 'bot' text token text", () => {
    const input = "the bot started";
    expect(sanitizeForOutput(input)).toBe("the bot started");
  });

  // --- F-11 textcrsr_ key ---

  it("text Cursor API key crsr_<hex>", () => {
    const input = `config dump: cursor.apiKey=${SYNTHETIC_CURSOR_KEY}`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_CURSOR_KEY);
    expect(out).not.toContain(SYNTHETIC_CURSOR_KEY_FRAGMENT);
    expect(out).toContain("crsr_***");
  });

  it("crsr_ text URL text", () => {
    const input = `see https://example.com/api?key=${SYNTHETIC_CURSOR_KEY}`;
    const out = sanitizeForOutput(input);
    expect(out).not.toContain(SYNTHETIC_CURSOR_KEY);
    expect(out).toContain("crsr_***");
  });

  // --- text ---

  it("text", () => {
    expect(sanitizeForOutput("")).toBe("");
  });

  it("text message text", () => {
    const input = "Telegram text (file_id=AgACAgIAAxkBAAOTaO...)";
    expect(sanitizeForOutput(input)).toBe(input);
  });

  it("text /Users/me/.ssh/id_rsatext F-11 text", () => {
    // text sanitizeForOutput text
    // text token / key text"text"text
    // text / text"text"text F-11 text logger redact hook text
    const input = "open /Users/me/.ssh/id_rsa failed";
    expect(sanitizeForOutput(input)).toBe(input);
  });

  it("text string text typotext", () => {
    expect(sanitizeForOutput(undefined as unknown as string)).toBe("");
    expect(sanitizeForOutput(null as unknown as string)).toBe("");
  });
});
