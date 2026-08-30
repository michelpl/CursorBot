import type { CommandContext } from "../dispatch.js";

const HELP_TEXT = `<b>cursorbot</b>
<code>/start</code> text <code>/help</code>  text
<code>/ws list</code>  text
<code>/ws use &lt;name&gt;</code>  text
<code>/ws add &lt;name&gt; &lt;abs-path&gt;</code>  text
<code>/ws remove &lt;name&gt;</code>  text
<code>/ws path</code>  text
<code>/reset</code>  text
<code>/cancel</code>  text run
<code>/status</code>  text agent / text / text
<code>/model &lt;id&gt;</code>  text

text <b>Reminders</b>
<code>/remind add text &lt;text&gt; &lt;text&gt;</code>  text
<code>/remind add prompt &lt;text&gt; &lt;prompt&gt;</code>  text agent
<code>/remind list</code>
<code>/remind del &lt;id&gt;</code>
text (10m, 1h30m) | text HH:MM | YYYY-MM-DDTHH:MM

text <b>Agent text</b>text Cursor agent text shell tool text
<code>cursorbot-attach-image /path/to/x.png [--caption "..."]</code>
<code>cursorbot-attach-file  /path/to/x.pdf [--caption "..."]</code>
text run text Telegram

text <b>text bot text</b> / text album text text agent text

text text text prompt
text <code>!</code> text text text run`;

export async function handleHelp(ctx: CommandContext): Promise<void> {
  await ctx.messenger.sendText(ctx.chatId, HELP_TEXT, { parseMode: "HTML" });
}
