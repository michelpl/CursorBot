import type { CommandContext } from "../dispatch.js";

// HTML textstatus text & < > text
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function handleStatus(ctx: CommandContext): Promise<void> {
  const w = ctx.registry.getActive();
  if (!w) {
    await ctx.messenger.sendText(ctx.chatId, "text");
    return;
  }
  const s = ctx.session.get(w.name);
  const lines = [
    `<b>text</b>: ${escapeHtml(w.name)}`,
    `<b>text</b>: <code>${escapeHtml(w.path)}</code>`,
    `<b>agentId</b>: <code>${escapeHtml(s?.agentId ?? "(text)")}</code>`,
    `<b>text</b>: <code>${escapeHtml(s?.model ?? "(text)")}</code>`,
  ];
  await ctx.messenger.sendText(ctx.chatId, lines.join("\n"), {
    parseMode: "HTML",
  });
}
