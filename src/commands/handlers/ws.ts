import { stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import type { CommandContext } from "../dispatch.js";
import { WorkspaceError } from "../../core/workspace/WorkspaceRegistry.js";
import { isPathWithinAllowedRoots } from "../../core/workspace/pathPolicy.js";
import { escapeHtml } from "../../util/html.js";

// /ws text
//   /ws list                        text
//   /ws use <name>                  text prompt text cwdtext
//   /ws add <name> <abs-path>       text + text
//   /ws remove <name>               text
//   /ws path                        text
export async function handleWs(
  args: string[],
  ctx: CommandContext,
): Promise<void> {
  const sub = args[0] ?? "list";
  switch (sub) {
    case "list": {
      const items = ctx.registry.list();
      const active = ctx.registry.getActive()?.name;
      if (items.length === 0) {
        await ctx.messenger.sendText(ctx.chatId, "text");
        return;
      }
      const body = items
        .map(
          (w) =>
            `${w.name === active ? "text " : "  "}${escapeHtml(w.name)} text ${escapeHtml(w.path)}`,
        )
        .join("\n");
      await ctx.messenger.sendText(ctx.chatId, body);
      return;
    }
    case "use": {
      const name = args[1];
      if (!name) {
        await ctx.messenger.sendText(ctx.chatId, "text/ws use <name>", {
          parseMode: "plain",
        });
        return;
      }
      try {
        ctx.registry.use(name);
        await ctx.registry.persist();
      } catch (e) {
        if (e instanceof WorkspaceError) {
          await ctx.messenger.sendText(ctx.chatId, escapeHtml(e.message));
          return;
        }
        throw e;
      }
      await ctx.messenger.sendText(ctx.chatId, `text${escapeHtml(name)}`);
      return;
    }
    case "add": {
      const name = args[1];
      const path = args[2];
      if (!name || !path) {
        await ctx.messenger.sendText(
          ctx.chatId,
          "text/ws add <name> <abs-path>",
          { parseMode: "plain" },
        );
        return;
      }
      if (!isAbsolute(path)) {
        await ctx.messenger.sendText(ctx.chatId, "text");
        return;
      }
      try {
        const s = await stat(path);
        if (!s.isDirectory()) {
          await ctx.messenger.sendText(ctx.chatId, "text");
          return;
        }
      } catch {
        await ctx.messenger.sendText(ctx.chatId, "text");
        return;
      }
      if (ctx.workspaceAllowedRoots && ctx.workspaceAllowedRoots.length > 0) {
        const allowed = await isPathWithinAllowedRoots(
          path,
          ctx.workspaceAllowedRoots,
        );
        if (!allowed) {
          await ctx.messenger.sendText(
            ctx.chatId,
            "text",
          );
          return;
        }
      }
      try {
        ctx.registry.add(name, path);
        await ctx.registry.persist();
      } catch (e) {
        if (e instanceof WorkspaceError) {
          await ctx.messenger.sendText(ctx.chatId, escapeHtml(e.message));
          return;
        }
        throw e;
      }
      await ctx.messenger.sendText(ctx.chatId, `text${escapeHtml(name)}`);
      return;
    }
    case "remove": {
      const name = args[1];
      if (!name) {
        await ctx.messenger.sendText(ctx.chatId, "text/ws remove <name>", {
          parseMode: "plain",
        });
        return;
      }
      try {
        ctx.registry.remove(name);
        await ctx.registry.persist();
      } catch (e) {
        if (e instanceof WorkspaceError) {
          await ctx.messenger.sendText(ctx.chatId, escapeHtml(e.message));
          return;
        }
        throw e;
      }
      await ctx.messenger.sendText(ctx.chatId, `text${escapeHtml(name)}`);
      return;
    }
    case "path": {
      const w = ctx.registry.getActive();
      await ctx.messenger.sendText(
        ctx.chatId,
        w ? escapeHtml(w.path) : "text",
      );
      return;
    }
    default:
      await ctx.messenger.sendText(
        ctx.chatId,
        "text/ws list|use|add|remove|path",
      );
  }
}
