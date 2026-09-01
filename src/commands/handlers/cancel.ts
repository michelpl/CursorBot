import type { CommandContext } from "../dispatch.js";

export async function handleCancel(ctx: CommandContext): Promise<void> {
  const w = ctx.registry.getActive();
  if (!w) {
    await ctx.messenger.sendText(ctx.chatId, "Nenhum workspace ativo.");
    return;
  }
  await ctx.orchestrator.cancel(w.name);
  await ctx.messenger.sendText(ctx.chatId, "Cancelamento solicitado.");
}
