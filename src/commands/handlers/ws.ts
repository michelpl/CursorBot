import { stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import type { CommandContext } from "../dispatch.js";
import { WorkspaceError } from "../../core/workspace/WorkspaceRegistry.js";
import { isPathWithinAllowedRoots } from "../../core/workspace/pathPolicy.js";
import { escapeHtml } from "../../util/html.js";

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
        await ctx.messenger.sendText(ctx.chatId, "No workspaces registered.");
        return;
      }
      const body = items
        .map(
          (w) =>
            `${w.name === active ? "→ " : "  "}${escapeHtml(w.name)} — ${escapeHtml(w.path)}`,
        )
        .join("\n");
      await ctx.messenger.sendText(ctx.chatId, body);
      return;
    }
    case "use": {
      const name = args[1];
      if (!name) {
        await ctx.messenger.sendText(ctx.chatId, "Usage: /ws use <name>", {
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
      await ctx.messenger.sendText(ctx.chatId, `Active workspace: ${escapeHtml(name)}`);
      return;
    }
    case "add": {
      const name = args[1];
      const path = args[2];
      if (!name || !path) {
        await ctx.messenger.sendText(ctx.chatId, "Usage: /ws add <name> <abs-path>", {
          parseMode: "plain",
        });
        return;
      }
      if (!isAbsolute(path)) {
        await ctx.messenger.sendText(ctx.chatId, "The path must be absolute.");
        return;
      }
      try {
        const s = await stat(path);
        if (!s.isDirectory()) {
          await ctx.messenger.sendText(ctx.chatId, "The path must be a directory.");
          return;
        }
      } catch {
        await ctx.messenger.sendText(ctx.chatId, "Directory not found.");
        return;
      }
      if (ctx.workspaceAllowedRoots && ctx.workspaceAllowedRoots.length > 0) {
        const allowed = await isPathWithinAllowedRoots(path, ctx.workspaceAllowedRoots);
        if (!allowed) {
          await ctx.messenger.sendText(
            ctx.chatId,
            "Path is outside the allowed directories (workspaces.allowedRoots).",
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
      await ctx.messenger.sendText(ctx.chatId, `Workspace added: ${escapeHtml(name)}`);
      return;
    }
    case "remove": {
      const name = args[1];
      if (!name) {
        await ctx.messenger.sendText(ctx.chatId, "Usage: /ws remove <name>", {
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
      await ctx.messenger.sendText(ctx.chatId, `Workspace removed: ${escapeHtml(name)}`);
      return;
    }
    case "path": {
      const w = ctx.registry.getActive();
      await ctx.messenger.sendText(
        ctx.chatId,
        w ? escapeHtml(w.path) : "No active workspace.",
      );
      return;
    }
    default:
      await ctx.messenger.sendText(
        ctx.chatId,
        "Usage: /ws list|use|add|remove|path",
      );
  }
}
