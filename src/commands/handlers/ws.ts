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
        await ctx.messenger.sendText(ctx.chatId, "Nenhum workspace registrado.");
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
        await ctx.messenger.sendText(ctx.chatId, "Uso: /ws use <nome>", {
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
      await ctx.messenger.sendText(ctx.chatId, `Workspace ativo: ${escapeHtml(name)}`);
      return;
    }
    case "add": {
      const name = args[1];
      const path = args[2];
      if (!name || !path) {
        await ctx.messenger.sendText(ctx.chatId, "Uso: /ws add <nome> <caminho-abs>", {
          parseMode: "plain",
        });
        return;
      }
      if (!isAbsolute(path)) {
        await ctx.messenger.sendText(ctx.chatId, "O caminho deve ser absoluto.");
        return;
      }
      try {
        const s = await stat(path);
        if (!s.isDirectory()) {
          await ctx.messenger.sendText(ctx.chatId, "O caminho deve ser um diretório.");
          return;
        }
      } catch {
        await ctx.messenger.sendText(ctx.chatId, "Diretório não encontrado.");
        return;
      }
      if (ctx.workspaceAllowedRoots && ctx.workspaceAllowedRoots.length > 0) {
        const allowed = await isPathWithinAllowedRoots(path, ctx.workspaceAllowedRoots);
        if (!allowed) {
          await ctx.messenger.sendText(
            ctx.chatId,
            "Caminho fora dos diretórios permitidos (workspaces.allowedRoots).",
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
      await ctx.messenger.sendText(ctx.chatId, `Workspace adicionado: ${escapeHtml(name)}`);
      return;
    }
    case "remove": {
      const name = args[1];
      if (!name) {
        await ctx.messenger.sendText(ctx.chatId, "Uso: /ws remove <nome>", {
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
      await ctx.messenger.sendText(ctx.chatId, `Workspace removido: ${escapeHtml(name)}`);
      return;
    }
    case "path": {
      const w = ctx.registry.getActive();
      await ctx.messenger.sendText(
        ctx.chatId,
        w ? escapeHtml(w.path) : "Nenhum workspace ativo.",
      );
      return;
    }
    default:
      await ctx.messenger.sendText(
        ctx.chatId,
        "Uso: /ws list|use|add|remove|path",
      );
  }
}
