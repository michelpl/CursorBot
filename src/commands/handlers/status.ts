import type { CommandContext } from "../dispatch.js";
import { escapeHtml } from "../../util/html.js";

export async function handleStatus(ctx: CommandContext): Promise<void> {
  const w = ctx.registry.getActive();
  if (!w) {
    await ctx.messenger.sendText(ctx.chatId, "No active workspace.");
    return;
  }
  const s = ctx.session.get(w.name);
  const modeInfo = ctx.orchestrator.getSessionStatus();
  const lines = [
    `<b>Workspace</b>: ${escapeHtml(w.name)}`,
    `<b>Path</b>: <code>${escapeHtml(w.path)}</code>`,
    `<b>ACP session</b>: <code>${escapeHtml(s?.sessionId ?? "(none)")}</code>`,
    `<b>ACP mode</b>: <code>${escapeHtml(modeInfo?.mode ?? "(inactive session)")}</code>`,
  ];
  if (modeInfo?.hasApprovedPlan) {
    lines.push(
      `<b>Approved plan</b>: ${escapeHtml(modeInfo.approvedPlanName ?? "yes")}`,
    );
  }
  await ctx.messenger.sendText(ctx.chatId, lines.join("\n"), {
    parseMode: "HTML",
  });
}
