import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ReminderScheduler } from "../../src/core/reminders/ReminderScheduler.js";
import {
  handleRemind,
  type RemindContext,
} from "../../src/commands/handlers/remind.js";
import { ReminderQuota } from "../../src/core/reminders/ReminderQuota.js";
import { StubMessenger } from "../helpers/StubMessenger.js";

describe("/remind", () => {
  let messenger: StubMessenger;
  let scheduler: ReminderScheduler;

  beforeEach(() => {
    messenger = new StubMessenger();
    scheduler = {
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockReturnValue([]),
    } as unknown as ReminderScheduler;
  });

  function ctx(): RemindContext {
    return {
      chatId: "1",
      userId: 100,
      messenger,
      scheduler,
      reminderQuota: new ReminderQuota(scheduler, { maxPerUser: 100 }),
      registry: {
        getActive: () => ({ name: "default", path: "/w" }),
      } as unknown as RemindContext["registry"],
      now: () => new Date("2026-05-05T16:00:00Z").getTime(),
      tz: "UTC",
      maxAheadDays: 30,
    };
  }

  it("/remind add text 10m text text scheduler.add text", async () => {
    await handleRemind(["add", "text", "10m", "text"], "10m text", ctx());
    expect(
      (scheduler.add as unknown as { mock: { calls: unknown[][] } }).mock.calls
        .length,
    ).toBe(1);
  });

  it("/remind add prompt 1h text BTC text kind=prompt text prompt text", async () => {
    await handleRemind(
      ["add", "prompt", "1h", "text BTC text"],
      "1h text BTC text",
      ctx(),
    );
    const args = (
      scheduler.add as unknown as {
        mock: { calls: { 0: { kind: string; prompt?: string } }[] };
      }
    ).mock.calls[0]!;
    const r = args[0] as { kind: string; prompt?: string };
    expect(r.kind).toBe("prompt");
    expect(r.prompt).toBe("text BTC text");
  });

  it("/remind add missing kind shows usage", async () => {
    await handleRemind(["add"], "", ctx());
    expect(messenger.sentTexts.some((m) => m.text.includes("Usage"))).toBe(true);
  });

  it("/remind add invalid time shows error", async () => {
    await handleRemind(["add", "text", "abcd", "x"], "abcd x", ctx());
    expect(messenger.sentTexts.some((m) => m.text.includes("Invalid time"))).toBe(
      true,
    );
    expect(
      (scheduler.add as unknown as { mock: { calls: unknown[] } }).mock.calls
        .length,
    ).toBe(0);
  });

  it("/remind list empty shows message", async () => {
    await handleRemind(["list"], "", ctx());
    expect(messenger.sentTexts.some((m) => /reminder/i.test(m.text))).toBe(true);
  });

  it("/remind del r-1 text scheduler.remove text", async () => {
    await handleRemind(["del", "r-1"], "r-1", ctx());
    expect(
      (scheduler.remove as unknown as { mock: { calls: unknown[] } }).mock
        .calls.length,
    ).toBe(1);
  });

  // textdispatch text rest text "add text 1h text"text sub text addtext
  // handleAdd text sub `add` text body text "add text 1h text"text
  it("dispatch text rest text 'add text 1h text' text body text 'text'", async () => {
    await handleRemind(
      ["add", "text", "1h", "text"],
      "add text 1h text",
      ctx(),
    );
    const args = (
      scheduler.add as unknown as {
        mock: { calls: { 0: { kind: string; text?: string } }[] };
      }
    ).mock.calls[0]!;
    const r = args[0] as { kind: string; text?: string };
    expect(r.kind).toBe("text");
    expect(r.text).toBe("text");
  });

  // textUSAGE text <text>/<text>/<id>text HTML parseMode
  // Telegram text 400 text parseMode: "plain"text
  it("USAGE / text / text plain parseModetext Telegram text HTML text", async () => {
    // 1. text sub
    await handleRemind([], "", ctx());
    // 2. text kind
    await handleRemind(["add"], "", ctx());
    // 3. text<text> text USAGE text casetext
    // 4. del text id
    await handleRemind(["del"], "", ctx());

    // text plain
    for (const s of messenger.sentTexts) {
      if (/[<>]/.test(s.text)) {
        expect(s.opts?.parseMode, `text plaintext${s.text}`).toBe(
          "plain",
        );
      }
    }
  });
});
