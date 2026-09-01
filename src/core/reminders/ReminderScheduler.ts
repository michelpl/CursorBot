import { logger } from "../../logger.js";
import type { ReminderStore, Reminder } from "./ReminderStore.js";

// textrunRemindertextorchestratortext+ sendTexttextmessenger text
export interface SchedulerDeps {
  store: ReminderStore;
  runReminder: (input: {
    chatId: string;
    kind: "text" | "prompt";
    text?: string;
    prompt?: string;
    workspaceId?: string;
    userId: number;
  }) => Promise<{ delivered: boolean; busy?: boolean }>;
  sendText: (chatId: string, text: string) => Promise<void>;
}

// setTimeout text 32-bit text~24.85 text ~23 text
const SETTIMEOUT_MAX = 2_000_000_000;

/**
 * Reminders text
 *
 * - start() text timer
 * - add(item) text store + text timer
 * - remove(id) text store + clearTimeout
 * - dispose() text timertext attempttext
 *
 * Busy textprompt text busy=truetext reminder.at text now+60s text store
 * text timertext busy text sendText text
 *
 * text attempts Map text
 * text store schematext
 */
export class ReminderScheduler {
  private timers = new Map<string, NodeJS.Timeout>();
  private attempts = new Map<string, number>();
  // text in-flight fire text / dispose text
  private firePromises = new Set<Promise<void>>();
  private disposed = false;

  constructor(private readonly deps: SchedulerDeps) {}

  // text in-flight fire text store.update / sendTexttext
  // text dispose() text dispose text
  async waitIdle(): Promise<void> {
    while (this.firePromises.size > 0) {
      await Promise.allSettled([...this.firePromises]);
    }
  }

  async start(): Promise<void> {
    const now = Date.now();
    const items = this.deps.store.list();
    for (const r of items) {
      if (r.at <= now) {
        // text reminder text
        logger.warn(
          { id: r.id, at: r.at, now },
          "text remindertext",
        );
        await this.deps.store.remove(r.id);
        continue;
      }
      this.scheduleTimer(r);
    }
  }

  async add(item: Reminder): Promise<void> {
    await this.deps.store.add(item);
    this.scheduleTimer(item);
  }

  async remove(id: string): Promise<void> {
    const t = this.timers.get(id);
    if (t) clearTimeout(t);
    this.timers.delete(id);
    this.attempts.delete(id);
    await this.deps.store.remove(id);
  }

  list(): Reminder[] {
    return this.deps.store.list();
  }

  dispose(): void {
    this.disposed = true;
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.attempts.clear();
  }

  // text timertextdelay text setTimeout text
  // text sleep texttimer text scheduleTimer text
  private scheduleTimer(r: Reminder): void {
    if (this.disposed) return;
    const delay = Math.max(0, r.at - Date.now());
    if (delay > SETTIMEOUT_MAX) {
      const t = setTimeout(() => this.scheduleTimer(r), SETTIMEOUT_MAX);
      this.timers.set(r.id, t);
      return;
    }
    const t = setTimeout(() => {
      // text fire text promise text waitIdle / dispose text
      const p = this.fire(r.id).finally(() => {
        this.firePromises.delete(p);
      });
      this.firePromises.add(p);
    }, delay);
    this.timers.set(r.id, t);
  }

  private async fire(id: string): Promise<void> {
    if (this.disposed) return;
    this.timers.delete(id);
    const r = this.deps.store.list().find((x) => x.id === id);
    if (!r) return;

    const attempt = (this.attempts.get(id) ?? 0) + 1;
    this.attempts.set(id, attempt);

    try {
      if (r.kind === "text") {
        await this.deps.runReminder({
          chatId: r.chatId,
          kind: "text",
          text: r.text,
          userId: r.createdBy,
        });
        await this.deps.store.remove(id);
        this.attempts.delete(id);
        return;
      }
      // prompt
      const res = await this.deps.runReminder({
        chatId: r.chatId,
        kind: "prompt",
        prompt: r.prompt,
        workspaceId: r.workspaceId,
        userId: r.createdBy,
      });
      if (res.delivered) {
        await this.deps.store.remove(id);
        this.attempts.delete(id);
        return;
      }
      // busy
      if (attempt >= 2) {
        // text busy text text sendText
        try {
          await this.deps.sendText(
            r.chatId,
            `text text${r.prompt}textagent text`,
          );
        } catch (e) {
          logger.error(
            { err: (e as Error).message, id },
            "fallback sendText text",
          );
        }
        await this.deps.store.remove(id);
        this.attempts.delete(id);
        return;
      }
      // text busy text text +60s + text store
      const newAt = Date.now() + 60_000;
      await this.deps.store.update(id, (r0) => ({ ...r0, at: newAt }));
      try {
        await this.deps.sendText(
          r.chatId,
          `Agente ocupado — lembrete reagendado em 1 min: ${r.prompt.slice(0, 60)}`,
        );
      } catch (e) {
        logger.error(
          { err: (e as Error).message, id },
          "text",
        );
      }
      const refreshed = this.deps.store.list().find((x) => x.id === id);
      if (refreshed) this.scheduleTimer(refreshed);
    } catch (e) {
      logger.error({ err: (e as Error).message, id }, "reminder fire text");
      // text store + text attempttext timer text fire text entry text store text
      await this.deps.store.remove(id);
      this.attempts.delete(id);
    }
  }
}
