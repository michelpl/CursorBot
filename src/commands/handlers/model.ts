import type { CommandContext } from "../dispatch.js";

// /model <id> text default modeltext sessionStoretext
// text agent text /resettext
export async function handleModel(
  args: string[],
  ctx: CommandContext,
): Promise<void> {
  const id = args[0];
  if (!id) {
    await ctx.messenger.sendText(
      ctx.chatId,
      "text/model <id>text /model auto",
      { parseMode: "plain" },
    );
    return;
  }
  const w = ctx.registry.getActive();
  if (!w) {
    await ctx.messenger.sendText(ctx.chatId, "text");
    return;
  }
  const s = ctx.session.get(w.name) ?? {};
  await ctx.session.set(w.name, { ...s, model: id });
  await ctx.messenger.sendText(
    ctx.chatId,
    `text <code>${id}</code>text agent text /resettext`,
    { parseMode: "HTML" },
  );
}
