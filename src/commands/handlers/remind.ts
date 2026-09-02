import type { IMessenger } from "../../core/messenger/IMessenger.js";
import type { WorkspaceRegistry } from "../../core/workspace/WorkspaceRegistry.js";
import type { ReminderScheduler } from "../../core/reminders/ReminderScheduler.js";
import type { ReminderQuota } from "../../core/reminders/ReminderQuota.js";
import { ReminderQuotaExceededError } from "../../core/reminders/errors.js";
import { logger } from "../../logger.js";
import {
  newReminderId,
  type Reminder,
} from "../../core/reminders/ReminderStore.js";
import { parseTimeExpr } from "../../core/reminders/timeParser.js";
import { escapeHtml } from "../../util/html.js";

export interface RemindContext {
  chatId: string;
  userId: number;
  messenger: IMessenger;
  scheduler: ReminderScheduler;
  registry: WorkspaceRegistry;
  now: () => number;
  tz: string;
  maxAheadDays: number;
  reminderQuota: ReminderQuota;
}

const USAGE = `Usage:
/remind add text   <when> <text>
/remind add prompt <when> <prompt>
/remind list
/remind del <id>

Formats: 10m, 1h30m | HH:MM | YYYY-MM-DDTHH:MM`;

export async function handleRemind(
  args: string[],
  rest: string,
  ctx: RemindContext,
): Promise<void> {
  const sub = args[0];
  const restAfterSub = sub ? stripFirstToken(rest, sub) : rest;
  if (sub === "add") return handleAdd(args.slice(1), restAfterSub, ctx);
  if (sub === "list") return handleList(ctx);
  if (sub === "del") return handleDel(args.slice(1), ctx);
  await ctx.messenger.sendText(ctx.chatId, USAGE, { parseMode: "plain" });
}

async function handleAdd(
  rest: string[],
  fullRest: string,
  ctx: RemindContext,
): Promise<void> {
  const kind = rest[0];
  if (kind !== "text" && kind !== "prompt") {
    await ctx.messenger.sendText(ctx.chatId, USAGE, { parseMode: "plain" });
    return;
  }
  const expr = rest[1];
  if (!expr) {
    await ctx.messenger.sendText(ctx.chatId, USAGE, { parseMode: "plain" });
    return;
  }
  const body = stripLeading(fullRest, kind, expr);
  if (!body) {
    await ctx.messenger.sendText(ctx.chatId, "Reminder body is empty.\n" + USAGE, {
      parseMode: "plain",
    });
    return;
  }

  const parsed = parseTimeExpr(expr, {
    now: ctx.now(),
    tz: ctx.tz,
    maxAheadDays: ctx.maxAheadDays,
  });
  if (parsed.error || !parsed.at) {
    await ctx.messenger.sendText(
      ctx.chatId,
      `Invalid time: ${parsed.error ?? "unknown"} (${expr})`,
    );
    return;
  }

  const id = newReminderId(parsed.at, ctx.now());
  let item: Reminder;
  if (kind === "text") {
    item = {
      id,
      createdAt: ctx.now(),
      createdBy: ctx.userId,
      chatId: ctx.chatId,
      kind: "text",
      at: parsed.at,
      tz: ctx.tz,
      text: body,
    };
  } else {
    const ws = ctx.registry.getActive();
    if (!ws) {
      await ctx.messenger.sendText(
        ctx.chatId,
        "No active workspace. Use /ws use before /remind add prompt.",
      );
      return;
    }
    item = {
      id,
      createdAt: ctx.now(),
      createdBy: ctx.userId,
      chatId: ctx.chatId,
      kind: "prompt",
      at: parsed.at,
      tz: ctx.tz,
      prompt: body,
      workspaceId: ws.name,
    };
  }
  try {
    await ctx.reminderQuota.checkAndAdd(item);
  } catch (e) {
    if (e instanceof ReminderQuotaExceededError) {
      logger.warn(
        { userId: ctx.userId, used: e.used, cap: e.cap },
        "reminder quota exceeded",
      );
      await ctx.messenger.sendText(
        ctx.chatId,
        `Reminder limit reached (${e.used}/${e.cap}). Use /remind del to remove one.`,
        { parseMode: "plain" },
      );
      return;
    }
    throw e;
  }
  await ctx.messenger.sendText(
    ctx.chatId,
    `Reminder ${id} scheduled for ${new Date(parsed.at).toISOString()}.`,
  );
}

async function handleList(ctx: RemindContext): Promise<void> {
  const items = ctx.scheduler.list();
  if (items.length === 0) {
    await ctx.messenger.sendText(ctx.chatId, "No reminders scheduled.");
    return;
  }
  const lines = items
    .sort((a, b) => a.at - b.at)
    .map((r) => {
      const when = new Date(r.at).toISOString();
      const summary =
        r.kind === "text"
          ? `text: ${escapeHtml(r.text)}`
          : `prompt[${escapeHtml(r.workspaceId)}]: ${escapeHtml(r.prompt)}`;
      return `${escapeHtml(r.id)}  ${when}\n  ${summary}`;
    });
  await ctx.messenger.sendText(ctx.chatId, lines.join("\n\n"));
}

async function handleDel(rest: string[], ctx: RemindContext): Promise<void> {
  const id = rest[0];
  if (!id) {
    await ctx.messenger.sendText(ctx.chatId, "Usage: /remind del <id>", {
      parseMode: "plain",
    });
    return;
  }
  await ctx.scheduler.remove(id);
  await ctx.messenger.sendText(ctx.chatId, `Reminder ${escapeHtml(id)} removed.`);
}

function stripLeading(rest: string, kind: string, expr: string): string {
  let s = rest.trimStart();
  if (s.startsWith(kind)) s = s.slice(kind.length).trimStart();
  if (s.startsWith(expr)) s = s.slice(expr.length).trimStart();
  return s;
}

function stripFirstToken(rest: string, token: string): string {
  const s = rest.trimStart();
  if (s.startsWith(token)) return s.slice(token.length).trimStart();
  return s;
}
