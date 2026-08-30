import { describe, it, expect } from "vitest";
import { TelegramMessenger } from "../../src/adapters/telegram/TelegramMessenger.js";

describe("TelegramMessenger", () => {
  it("text start text stop text", async () => {
    const m = new TelegramMessenger({
      botToken: "1234:fake-not-used",
      parseMode: "HTML",
      maxFileSizeBytes: 20 * 1024 * 1024,
    });
    await expect(m.stop()).resolves.toBeUndefined();
  });

  it("text start text sendText text 'text'", async () => {
    const m = new TelegramMessenger({
      botToken: "1234:fake-not-used",
      parseMode: "HTML",
      maxFileSizeBytes: 20 * 1024 * 1024,
    });
    await expect(m.sendText("1", "hi")).rejects.toThrow(/text/);
  });
});
