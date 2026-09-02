import type { CommandContext } from "../dispatch.js";

export async function handleCancel(ctx: CommandContext): Promise<void> {
  const w = ctx.registry.getActive();
  if (!w) {
    await ctx.messenger.sendText(ctx.chatId, "No active workspace.");
    return;
  }
  await ctx.orchestrator.cancel(w.name);
  await ctx.messenger.sendText(ctx.chatId, "Cancel requested.");
}
