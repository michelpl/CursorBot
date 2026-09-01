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
      "Com ACP, o modelo é definido pelo Cursor CLI.\nUso legado: /model <id> (sem efeito).",
      { parseMode: "plain" },
    );
    return;
  }
  const w = ctx.registry.getActive();
  if (!w) {
    await ctx.messenger.sendText(ctx.chatId, "Nenhum workspace ativo.");
    return;
  }
  await ctx.messenger.sendText(
    ctx.chatId,
    `Com ACP, <code>${id}</code> não altera o modelo em runtime. Configure no Cursor CLI.`,
    { parseMode: "HTML" },
  );
}
