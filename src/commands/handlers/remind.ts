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

const USAGE = `text
/remind add text   <text> <text>
/remind add prompt <text> <prompt>
/remind list
/remind del <id>

text (10m, 1h30m) | text HH:MM | YYYY-MM-DDTHH:MM`;

/**
 * /remind text
 * - addtext kind / text / bodytext scheduler.add
 * - listtext scheduler.list() text
 * - deltextscheduler.remove(id)
 *
 * text tokentext `2026-05-06 09:00` text
 * text `2026-05-06T09:00` text T text
 */
export async function handleRemind(
  args: string[],
  rest: string,
  ctx: RemindContext,
): Promise<void> {
  const sub = args[0];
  // dispatch text rest text "add text 1h text"text
  // text sub text handleAdd text fullRest text "text 1h text"text
  // text args.slice(1) text stripLeading text sub text bodytext
  const restAfterSub = sub ? stripFirstToken(rest, sub) : rest;
  if (sub === "add") return handleAdd(args.slice(1), restAfterSub, ctx);
  if (sub === "list") return handleList(ctx);
  if (sub === "del") return handleDel(args.slice(1), ctx);
  // text"text/text"text plain parseModetextUSAGE text <text> text
  // text HTML parseMode textTelegram text 400text
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
  // body text tokentexttext|prompt + text
  const body = stripLeading(fullRest, kind, expr);
  if (!body) {
    await ctx.messenger.sendText(ctx.chatId, "text\n" + USAGE, {
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
      `text text ${parsed.error ?? "text"}text${expr}`,
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
        "text workspacetext /ws use text /remind add prompttext",
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
        `Reminder text${e.used}/${e.cap}text /remind del text`,
        { parseMode: "plain" },
      );
      return;
    }
    throw e;
  }
  await ctx.messenger.sendText(
    ctx.chatId,
    `text ${id}text ${new Date(parsed.at).toISOString()} text`,
  );
}

async function handleList(ctx: RemindContext): Promise<void> {
  const items = ctx.scheduler.list();
  if (items.length === 0) {
    await ctx.messenger.sendText(ctx.chatId, "text remindertext");
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
    await ctx.messenger.sendText(ctx.chatId, "text/remind del <id>", {
      parseMode: "plain",
    });
    return;
  }
  await ctx.scheduler.remove(id);
  await ctx.messenger.sendText(
    ctx.chatId,
    `text ${escapeHtml(id)}text`,
  );
}

// text fullRest text kind / expr text token text
function stripLeading(rest: string, kind: string, expr: string): string {
  let s = rest.trimStart();
  if (s.startsWith(kind)) s = s.slice(kind.length).trimStart();
  if (s.startsWith(expr)) s = s.slice(expr.length).trimStart();
  return s;
}

// text rest text token text stripLeading text handleRemind text subtext
function stripFirstToken(rest: string, token: string): string {
  const s = rest.trimStart();
  if (s.startsWith(token)) return s.slice(token.length).trimStart();
  return s;
}
