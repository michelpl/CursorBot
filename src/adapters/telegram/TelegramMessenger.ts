import { InputFile } from "grammy";
import { createBot, type GrammyBot } from "./grammyClient.js";
import { ImageGroupBuffer } from "./ImageGroupBuffer.js";
import { downloadTelegramFile } from "./downloadFile.js";
import type { IMessenger } from "../../core/messenger/IMessenger.js";
import type {
  IncomingTextMessage,
  IncomingImageMessage,
  IncomingImageGroup,
  MessageHandle,
  ImagePayload,
  FilePayload,
  SendOptions,
} from "../../core/messenger/types.js";
import { logger } from "../../logger.js";

export interface TelegramMessengerConfig {
  botToken: string;
  parseMode: "HTML" | "Markdown" | "plain";
  // text emit text
  allowedUserIds?: number[];
  // M2: text debounce text albumtext
  mediaGroupDebounceMs?: number;
  // F-05: textfile_size text / content-length / text
  maxFileSizeBytes: number;
}

// ImageGroupBuffer text photo text
// textdata text Promise<string>text grammy text update text push text updatetext
// textflush text await text promise text emittext
//
// textgrammy text `bot.on("message:photo", async (ctx) => {...})` text async handlertext
// text handler text update text handler text await text ~1stext
// album text 3 text push text 1-2stext debounce 200mstext buffer text 3 text grouptext
interface PendingPhoto {
  dataPromise: Promise<string>;
  mimeType: string;
  caption?: string;
  chatId: string;
  userId: number;
  username?: string;
}

/**
 * grammy text IMessengertext
 * - long-pollingtextbot.start() text
 * - textM2text ImageGroupBuffer text media_group_id text imageGroup text
 *   text image text listener text emittext imageGrouptext
 * - editText textTelegram text"text"text
 */
export class TelegramMessenger implements IMessenger {
  private bot?: GrammyBot;
  private textListeners: Array<(m: IncomingTextMessage) => void> = [];
  private imageListeners: Array<(m: IncomingImageMessage) => void> = [];
  private imageGroupListeners: Array<(m: IncomingImageGroup) => void> = [];
  private buffer?: ImageGroupBuffer<PendingPhoto>;

  constructor(private readonly cfg: TelegramMessengerConfig) {}

  async start(): Promise<void> {
    const bot = createBot(this.cfg.botToken);
    this.bot = bot;

    // M2: text ImageGroupBuffer text media_group_id text emit
    this.buffer = new ImageGroupBuffer<PendingPhoto>(
      this.cfg.mediaGroupDebounceMs ?? 200,
      (items) => {
        if (items.length === 0) return;
        // fire text fire-and-forgettext
        // await text dataPromise text imageGroup listenerstext
        void (async () => {
          try {
            const datas = await Promise.all(items.map((i) => i.dataPromise));
            // text chatId / userId text"text"textcaption text
            const first = items[0]!;
            const caption = items.map((i) => i.caption).find((c) => !!c);
            const group: IncomingImageGroup = {
              chatId: first.chatId,
              userId: first.userId,
              username: first.username,
              images: items.map((i, idx) => ({
                data: datas[idx]!,
                mimeType: i.mimeType,
              })),
              caption,
            };
            for (const l of this.imageGroupListeners) l(group);
          } catch (e) {
            logger.error(
              { err: (e as Error).message },
              "imageGroup text",
            );
          }
        })();
      },
    );

    bot.on("message:text", (ctx) => {
      const userId = ctx.from?.id;
      if (userId === undefined) return;
      if (
        this.cfg.allowedUserIds &&
        !this.cfg.allowedUserIds.includes(userId)
      ) {
        return;
      }
      const chatId = String(ctx.chat.id);
      const text = ctx.message.text;
      for (const l of this.textListeners) {
        l({ chatId, userId, username: ctx.from?.username, text });
      }
    });

    // texthandler text**text await** getFile / fetchtext
    // textgrammy text dispatch async handlertext await text update text pushtext
    // text album text push text 1-2s text debounce text 200ms text buffer text
    // text handler text dataPromise text
    bot.on("message:photo", (ctx) => {
      const userId = ctx.from?.id;
      if (userId === undefined) return;
      if (
        this.cfg.allowedUserIds &&
        !this.cfg.allowedUserIds.includes(userId)
      ) {
        return;
      }
      const chatId = String(ctx.chat.id);
      const photos = ctx.message.photo;
      const largest = photos[photos.length - 1];
      if (!largest) return;
      const fileId = largest.file_id;
      const caption = ctx.message.caption ?? undefined;
      const groupId = ctx.message.media_group_id ?? undefined;
      const dataPromise = downloadTelegramFile({
        api: ctx.api,
        fileId,
        botToken: this.cfg.botToken,
        maxFileSizeBytes: this.cfg.maxFileSizeBytes,
      });
      // textpromise text"text await"text item text push text buffertext
      // text catch text unhandledRejection text node text
      // text buffer flush text Promise.all text
      dataPromise.catch(() => {
        /* text flush text try/catch text */
      });
      const item: PendingPhoto = {
        dataPromise,
        mimeType: "image/jpeg",
        caption,
        chatId,
        userId,
        username: ctx.from?.username,
      };
      this.buffer?.push(groupId, item);
    });

    // bot.start text long-polling text awaittext
    bot.start({ drop_pending_updates: true }).catch((e) => {
      logger.error({ err: (e as Error).message }, "grammy text");
    });
  }

  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
      this.bot = undefined;
    }
    this.buffer?.dispose();
    this.buffer = undefined;
  }

  on(event: "text", h: (m: IncomingTextMessage) => void): void;
  on(event: "image", h: (m: IncomingImageMessage) => void): void;
  on(event: "imageGroup", h: (m: IncomingImageGroup) => void): void;
  on(
    event: "text" | "image" | "imageGroup",
    h: (m: never) => void,
  ): void {
    if (event === "text") {
      this.textListeners.push(h as (m: IncomingTextMessage) => void);
    } else if (event === "image") {
      this.imageListeners.push(h as (m: IncomingImageMessage) => void);
    } else {
      this.imageGroupListeners.push(h as (m: IncomingImageGroup) => void);
    }
  }

  async sendText(
    chatId: string,
    text: string,
    opts?: SendOptions,
  ): Promise<MessageHandle> {
    const r = await this.requireBot().api.sendMessage(Number(chatId), text, {
      parse_mode: this.toParseMode(opts?.parseMode ?? this.cfg.parseMode),
      reply_parameters: opts?.replyToMessageId
        ? { message_id: Number(opts.replyToMessageId) }
        : undefined,
    });
    return { messageId: String(r.message_id) };
  }

  async editText(
    chatId: string,
    messageId: string,
    text: string,
    opts?: SendOptions,
  ): Promise<void> {
    try {
      await this.requireBot().api.editMessageText(
        Number(chatId),
        Number(messageId),
        text,
        {
          parse_mode: this.toParseMode(opts?.parseMode ?? this.cfg.parseMode),
        },
      );
    } catch (e) {
      const msg = (e as Error).message ?? "";
      // Telegram text 400text
      if (msg.includes("message is not modified")) return;
      throw e;
    }
  }

  async sendImage(
    chatId: string,
    image: ImagePayload,
    caption?: string,
  ): Promise<MessageHandle> {
    const r = await this.requireBot().api.sendPhoto(
      Number(chatId),
      new InputFile(image.data, image.filename),
      { caption, parse_mode: this.toParseMode(this.cfg.parseMode) },
    );
    return { messageId: String(r.message_id) };
  }

  async sendDocument(
    chatId: string,
    file: FilePayload,
    caption?: string,
  ): Promise<MessageHandle> {
    const r = await this.requireBot().api.sendDocument(
      Number(chatId),
      new InputFile(file.data, file.filename),
      { caption, parse_mode: this.toParseMode(this.cfg.parseMode) },
    );
    return { messageId: String(r.message_id) };
  }

  async sendTyping(chatId: string): Promise<void> {
    await this.requireBot().api.sendChatAction(Number(chatId), "typing");
  }

  private requireBot(): GrammyBot {
    if (!this.bot) throw new Error("TelegramMessenger text");
    return this.bot;
  }

  private toParseMode(
    mode: "HTML" | "Markdown" | "plain",
  ): "HTML" | "MarkdownV2" | undefined {
    if (mode === "HTML") return "HTML";
    if (mode === "Markdown") return "MarkdownV2";
    return undefined;
  }
}
