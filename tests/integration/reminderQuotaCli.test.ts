import { describe, it, expect, vi } from "vitest";
import { handleRemind } from "../../src/commands/handlers/remind.js";
import { ReminderQuota } from "../../src/core/reminders/ReminderQuota.js";

// F-06 PR etext/remind add text ReminderQuota text

function makeFakeMessenger() {
  const sent: Array<{ chatId: string; text: string }> = [];
  return {
    sent,
    sendText: vi.fn(async (chatId: string, text: string) => {
      sent.push({ chatId, text });
      return { messageId: `m-${sent.length}` };
    }),
  };
}

function makeFakeRegistry() {
  return {
    getActive: () => ({ name: "ws1", path: "/tmp/ws1" }),
  };
}

function makeFakeScheduler(initialItems: unknown[] = []) {
  const items = [...initialItems];
  return {
    items,
    list: () => [...items],
    add: vi.fn(async (r: unknown) => {
      items.push(r);
    }),
    remove: vi.fn(async () => {}),
  };
}

describe("handleRemind + ReminderQuota", () => {
  it("text 101 text reminder text store", async () => {
    const messenger = makeFakeMessenger();
    const initial = Array.from({ length: 100 }, (_, i) => ({
      id: `r${i}`,
      createdAt: 0,
      createdBy: 1,
      chatId: "C",
      kind: "text",
      at: 60_000,
      tz: "UTC",
      text: "x",
    }));
    const scheduler = makeFakeScheduler(initial);
    const quota = new ReminderQuota(scheduler as never, { maxPerUser: 100 });

    await handleRemind(
      ["add", "text", "1m", "text"],
      "add text 1m text",
      {
        chatId: "C",
        userId: 1,
        messenger: messenger as never,
        scheduler: scheduler as never,
        registry: makeFakeRegistry() as never,
        now: () => 0,
        tz: "UTC",
        maxAheadDays: 30,
        reminderQuota: quota,
      },
    );

    expect(scheduler.items.length).toBe(100);
    expect(scheduler.add).not.toHaveBeenCalled();
    expect(messenger.sent[messenger.sent.length - 1]?.text).toMatch(
      /Reminder limit/i,
    );
  });
});
