import type { CommandContext } from "../dispatch.js";

export async function handleReset(ctx: CommandContext): Promise<void> {
  const w = ctx.registry.getActive();
  if (!w) {
    await ctx.messenger.sendText(ctx.chatId, "No active workspace.");
    return;
  }
  await ctx.orchestrator.resetWorkspace(w.name);
  await ctx.messenger.sendText(ctx.chatId, `Session reset for ${w.name}.`);
}
