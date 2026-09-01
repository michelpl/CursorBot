import type { IMessenger } from "../core/messenger/IMessenger.js";
import { escapeHtml } from "./html.js";

const TELEGRAM_MAX = 4096;
const CHUNK_SIZE = 3800;

/** Send long HTML text in multiple Telegram messages. */
export async function sendLongHtmlText(
  messenger: IMessenger,
  chatId: string,
  text: string,
  opts?: { header?: string },
): Promise<void> {
  const body = opts?.header ? `${opts.header}\n${text}` : text;
  if (body.length <= CHUNK_SIZE) {
    await messenger.sendText(chatId, escapeHtml(body), { parseMode: "HTML" });
    return;
  }
  let offset = 0;
  let part = 1;
  while (offset < body.length) {
    const chunk = body.slice(offset, offset + CHUNK_SIZE);
    const prefix = part === 1 && opts?.header ? `${opts.header}\n` : `(continuação ${part})\n`;
    await messenger.sendText(chatId, escapeHtml(`${prefix}${chunk}`), {
      parseMode: "HTML",
    });
    offset += CHUNK_SIZE;
    part++;
  }
}
