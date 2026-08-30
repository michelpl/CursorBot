import { JsonStore } from "../persist/jsonStore.js";
import { z } from "zod";

// reminder text kindtexttext textprompt text agent text prompt
export interface ReminderText {
  id: string;
  createdAt: number;
  createdBy: number;
  chatId: string;
  kind: "text";
  at: number;
  tz: string;
  text: string;
}

export interface ReminderPrompt {
  id: string;
  createdAt: number;
  createdBy: number;
  chatId: string;
  kind: "prompt";
  at: number;
  tz: string;
  prompt: string;
  workspaceId: string;
}

export type Reminder = ReminderText | ReminderPrompt;

interface RemindersFile {
  items: Reminder[];
}

const ReminderBaseSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  createdBy: z.number(),
  chatId: z.string(),
  at: z.number(),
  tz: z.string(),
});

const ReminderTextSchema = ReminderBaseSchema.extend({
  kind: z.literal("text"),
  text: z.string(),
});

const ReminderPromptSchema = ReminderBaseSchema.extend({
  kind: z.literal("prompt"),
  prompt: z.string(),
  workspaceId: z.string(),
});

const RemindersFileSchema = z.object({
  items: z.array(z.union([ReminderTextSchema, ReminderPromptSchema])),
});

/**
 * Reminders text JsonStoretext
 * text state text list() text persist text
 */
export class ReminderStore {
  private readonly store: JsonStore<RemindersFile>;
  private state: RemindersFile = { items: [] };

  constructor(filePath: string) {
    this.store = new JsonStore<RemindersFile>(
      filePath,
      { items: [] },
      (raw) => RemindersFileSchema.parse(raw),
    );
  }

  async init(): Promise<void> {
    this.state = await this.store.readOrInit();
  }

  list(): Reminder[] {
    return [...this.state.items];
  }

  async add(item: Reminder): Promise<void> {
    this.state.items.push(item);
    await this.persist();
  }

  async remove(id: string): Promise<void> {
    this.state.items = this.state.items.filter((r) => r.id !== id);
    await this.persist();
  }

  // text
  async update(id: string, fn: (r: Reminder) => Reminder): Promise<void> {
    let changed = false;
    this.state.items = this.state.items.map((r) => {
      if (r.id !== id) return r;
      changed = true;
      return fn(r);
    });
    if (changed) await this.persist();
  }

  private async persist(): Promise<void> {
    await this.store.write(this.state);
  }
}

// text reminder idtextr-{YYYYMMDD-HHMMSS}-{seq3}
// text seqtext seq text
// text seq text
let seq = 0;
export function newReminderId(_at: number, now: number): string {
  const d = new Date(now);
  const pad = (n: number): string => String(n).padStart(2, "0");
  const stamp =
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  seq = (seq + 1) % 1000;
  return `r-${stamp}-${String(seq).padStart(3, "0")}`;
}
