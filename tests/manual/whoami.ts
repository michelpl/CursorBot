// text bot text from.id (text userId) text
// text: TELEGRAM_BOT_TOKEN=... npx tsx tests/manual/whoami.ts
//
// text
//   1. text
//   2. text Telegram text @<text bot> text "hi"text
//   3. text "text userId: <text>"text
//
// text userId text config.json text telegram.allowedUserIds: [<text>] text
import { Bot } from "grammy";

async function main(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("set TELEGRAM_BOT_TOKEN first");
    process.exit(1);
  }
  const bot = new Bot(token);
  console.log("text bot text...");
  let done = false;
  bot.on("message", (ctx) => {
    if (done) return;
    done = true;
    const u = ctx.from;
    const c = ctx.chat;
    console.log("\ntext");
    console.log("text userId:", u?.id);
    console.log("text:", u?.username ?? "(text)");
    console.log("text:", `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim());
    console.log("chatIdtext userId text:", c.id);
    console.log("text");
    console.log(`text config.json text telegram.allowedUserIdstext`);
    console.log(`[${u?.id}]`);
    void bot.stop().then(() => process.exit(0));
  });
  await bot.start({ drop_pending_updates: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
