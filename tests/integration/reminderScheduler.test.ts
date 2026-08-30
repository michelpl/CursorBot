import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ReminderScheduler,
  type SchedulerDeps,
} from "../../src/core/reminders/ReminderScheduler.js";
import {
  ReminderStore,
  type Reminder,
} from "../../src/core/reminders/ReminderStore.js";

describe("ReminderScheduler", () => {
  let dir: string;
  let path: string;
  let store: ReminderStore;
  // text vi.fn text SchedulerDeps text generic Mock
  let runReminder: ReturnType<
    typeof vi.fn<SchedulerDeps["runReminder"]>
  >;
  let sendText: ReturnType<typeof vi.fn<SchedulerDeps["sendText"]>>;
  let scheduler: ReminderScheduler;

  // text IOtext fs.renametextfake timer text fake setImmediate
  // textsetImmediate text native callback text nextTick text
  async function flushIo(times = 5): Promise<void> {
    for (let i = 0; i < times; i++) {
      await new Promise<void>((r) => setImmediate(r));
    }
  }

  beforeEach(async () => {
    // text fake text APItextsetImmediate / process.nextTick / queueMicrotask
    // text fs/promises text native text
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    dir = await mkdtemp(join(tmpdir(), "rsch-"));
    path = join(dir, "reminders.json");
    store = new ReminderStore(path);
    await store.init();
    runReminder = vi.fn<SchedulerDeps["runReminder"]>();
    sendText = vi.fn<SchedulerDeps["sendText"]>();
    const deps: SchedulerDeps = {
      store,
      runReminder,
      sendText,
    };
    scheduler = new ReminderScheduler(deps);
  });
  afterEach(async () => {
    scheduler.dispose();
    // text pending IOtext .tmp renametext ENOTEMPTY
    await flushIo(10);
    vi.useRealTimers();
    await rm(dir, { recursive: true, force: true });
  });

  const NOW = 1735000000000;

  function textRem(id: string, at: number): Reminder {
    return {
      id,
      createdAt: NOW,
      createdBy: 1,
      chatId: "1",
      kind: "text",
      at,
      tz: "UTC",
      text: "x",
    };
  }

  function promptRem(id: string, at: number): Reminder {
    return {
      id,
      createdAt: NOW,
      createdBy: 1,
      chatId: "1",
      kind: "prompt",
      at,
      tz: "UTC",
      prompt: "p",
      workspaceId: "default",
    };
  }

  it("add text text runReminder + text store text", async () => {
    vi.setSystemTime(NOW);
    runReminder.mockResolvedValue({ delivered: true });
    await scheduler.start();
    await scheduler.add(textRem("r-1", NOW + 1000));
    expect(store.list().length).toBe(1);
    await vi.advanceTimersByTimeAsync(1100);
    await scheduler.waitIdle();
    expect(runReminder).toHaveBeenCalledTimes(1);
    expect(store.list().length).toBe(0);
  });

  it("text", async () => {
    vi.setSystemTime(NOW);
    await store.add(textRem("r-old", NOW - 10_000));
    await scheduler.start();
    expect(store.list().length).toBe(0);
    expect(runReminder).not.toHaveBeenCalled();
  });

  it("text reminder text at text", async () => {
    vi.setSystemTime(NOW);
    await store.add(textRem("r-1", NOW + 5000));
    await scheduler.start();
    scheduler.dispose();
    // text
    runReminder.mockClear();
    runReminder.mockResolvedValue({ delivered: true });
    const store2 = new ReminderStore(path);
    await store2.init();
    const sch2 = new ReminderScheduler({
      store: store2,
      runReminder,
      sendText,
    });
    await sch2.start();
    await vi.advanceTimersByTimeAsync(5500);
    await sch2.waitIdle();
    expect(runReminder).toHaveBeenCalledTimes(1);
    sch2.dispose();
  });

  it("prompt busy text text +60s + text store + sendText text", async () => {
    vi.setSystemTime(NOW);
    runReminder
      .mockResolvedValueOnce({ delivered: false, busy: true }) // text busy
      .mockResolvedValueOnce({ delivered: true }); // 60s text
    await scheduler.start();
    await scheduler.add(promptRem("r-1", NOW + 1000));
    await vi.advanceTimersByTimeAsync(1100);
    await scheduler.waitIdle();
    // textsendText text + at text
    expect(sendText).toHaveBeenCalledTimes(1);
    expect(sendText.mock.calls[0]![1] as string).toMatch(/text 1 text/);
    expect(store.list()[0]!.at).toBe(NOW + 1000 + 60_000);
    // 60s text
    await vi.advanceTimersByTimeAsync(60_000);
    await scheduler.waitIdle();
    expect(runReminder).toHaveBeenCalledTimes(2);
    expect(store.list().length).toBe(0);
  });

  it("prompt text busy text text sendText + text + text", async () => {
    vi.setSystemTime(NOW);
    runReminder.mockResolvedValue({ delivered: false, busy: true });
    await scheduler.start();
    await scheduler.add(promptRem("r-1", NOW + 1000));
    await vi.advanceTimersByTimeAsync(1100); // text busy text text
    await scheduler.waitIdle();
    await vi.advanceTimersByTimeAsync(60_000); // text busy text text
    await scheduler.waitIdle();
    expect(runReminder).toHaveBeenCalledTimes(2);
    // text "text" text text
    const fallbackCall = sendText.mock.calls.find((c) =>
      (c[1] as string).startsWith("text text"),
    );
    expect(fallbackCall).toBeDefined();
    expect(store.list().length).toBe(0);
  });

  it("remove(id) text timer", async () => {
    vi.setSystemTime(NOW);
    await scheduler.start();
    await scheduler.add(textRem("r-1", NOW + 5000));
    await scheduler.remove("r-1");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(runReminder).not.toHaveBeenCalled();
    expect(store.list().length).toBe(0);
  });
});
