import { describe, it, expect } from "vitest";
import { ReminderQuota } from "../../src/core/reminders/ReminderQuota.js";
import { ReminderQuotaExceededError } from "../../src/core/reminders/errors.js";
import type { Reminder } from "../../src/core/reminders/ReminderStore.js";

// F-06 PR etextReminderQuota text
// quota text store.list() textcheckAndAdd text addtext

function makeReminder(id: string, createdBy: number): Reminder {
  return {
    id,
    createdAt: 0,
    createdBy,
    chatId: "C",
    kind: "text",
    at: 0,
    tz: "UTC",
    text: "x",
  };
}

function makeFakeStore(initial: Reminder[] = []) {
  const items = [...initial];
  return {
    items,
    list: () => [...items],
    add: async (r: Reminder) => {
      items.push(r);
    },
  };
}

describe("ReminderQuota", () => {
  it("99 -> 100 text 101 text", async () => {
    const store = makeFakeStore(
      Array.from({ length: 99 }, (_, i) => makeReminder(`r${i}`, 1)),
    );
    const q = new ReminderQuota(store, { maxPerUser: 100 });
    await q.checkAndAdd(makeReminder("r99", 1));
    await expect(q.checkAndAdd(makeReminder("r100", 1))).rejects.toThrow(
      ReminderQuotaExceededError,
    );
    expect(store.items.length).toBe(100);
  });

  it("text user text", async () => {
    const items = Array.from({ length: 100 }, (_, i) =>
      makeReminder(`r${i}`, 1),
    );
    const store = makeFakeStore(items);
    const q = new ReminderQuota(store, { maxPerUser: 100 });
    await expect(q.checkAndAdd(makeReminder("rX", 1))).rejects.toThrow(
      ReminderQuotaExceededError,
    );
    await q.checkAndAdd(makeReminder("rY", 2));
    expect(store.items.length).toBe(101);
  });

  it("textquota text store text", async () => {
    const items = Array.from({ length: 100 }, (_, i) =>
      makeReminder(`r${i}`, 1),
    );
    const store = makeFakeStore(items);
    const q = new ReminderQuota(store, { maxPerUser: 100 });
    store.items.shift();
    await q.checkAndAdd(makeReminder("rZ", 1));
    expect(store.items.length).toBe(100);
  });
});
