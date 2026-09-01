import type { CommandContext } from "../dispatch.js";
import { escapeHtml } from "../../util/html.js";

export async function handleStatus(ctx: CommandContext): Promise<void> {
  const w = ctx.registry.getActive();
  if (!w) {
    await ctx.messenger.sendText(ctx.chatId, "Nenhum workspace ativo.");
    return;
  }
  const s = ctx.session.get(w.name);
  const modeInfo = ctx.orchestrator.getSessionStatus();
  const lines = [
    `<b>Workspace</b>: ${escapeHtml(w.name)}`,
    `<b>Caminho</b>: <code>${escapeHtml(w.path)}</code>`,
    `<b>Sessão ACP</b>: <code>${escapeHtml(s?.sessionId ?? "(nenhuma)")}</code>`,
    `<b>Modo ACP</b>: <code>${escapeHtml(modeInfo?.mode ?? "(sessão inativa)")}</code>`,
  ];
  if (modeInfo?.hasApprovedPlan) {
    lines.push(
      `<b>Plano aprovado</b>: ${escapeHtml(modeInfo.approvedPlanName ?? "sim")}`,
    );
  }
  await ctx.messenger.sendText(ctx.chatId, lines.join("\n"), {
    parseMode: "HTML",
  });
}
