import type { CommandContext } from "../dispatch.js";

/** ACP uses Cursor CLI model selection; /model is a documented no-op. */
export async function handleModel(
  args: string[],
  ctx: CommandContext,
): Promise<void> {
  const id = args[0];
  if (!id) {
    await ctx.messenger.sendText(
      ctx.chatId,
      "With ACP, the model is set by the Cursor CLI.\nLegacy usage: /model <id> (no effect).",
      { parseMode: "plain" },
    );
    return;
  }
  const w = ctx.registry.getActive();
  if (!w) {
    await ctx.messenger.sendText(ctx.chatId, "No active workspace.");
    return;
  }
  await ctx.messenger.sendText(
    ctx.chatId,
    `With ACP, <code>${id}</code> does not change the model at runtime. Configure it in the Cursor CLI.`,
    { parseMode: "HTML" },
  );
}
