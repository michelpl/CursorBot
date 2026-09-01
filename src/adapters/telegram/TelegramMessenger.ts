import { InputFile, InlineKeyboard } from "grammy";
import { createBot, type GrammyBot } from "./grammyClient.js";
import { ImageGroupBuffer } from "./ImageGroupBuffer.js";
import { downloadTelegramFile } from "./downloadFile.js";
import type {
  IncomingTextMessage,
  IncomingImageMessage,
  IncomingImageGroup,
  IncomingCallbackQuery,
  MessageHandle,
  ImagePayload,
  FilePayload,
  SendOptions,
} from "../../core/messenger/types.js";
import type { IMessenger, InteractiveMessage } from "../../core/messenger/IMessenger.js";
import { logger } from "../../logger.js";

export interface TelegramMessengerConfig {
  botToken: string;
  parseMode: "HTML" | "Markdown" | "plain";
  allowedUserIds?: number[];
  mediaGroupDebounceMs?: number;
  maxFileSizeBytes: number;
}

interface PendingPhoto {
  dataPromise: Promise<string>;
  mimeType: string;
  caption?: string;
  chatId: string;
  userId: number;
  username?: string;
}

/** Grammy-based IMessenger with inline keyboard support for ACP interactions. */
export class TelegramMessenger implements IMessenger {
  private bot?: GrammyBot;
  private textListeners: Array<(m: IncomingTextMessage) => void> = [];
  private imageListeners: Array<(m: IncomingImageMessage) => void> = [];
  private imageGroupListeners: Array<(m: IncomingImageGroup) => void> = [];
  private callbackListeners: Array<(m: IncomingCallbackQuery) => void> = [];
  private buffer?: ImageGroupBuffer<PendingPhoto>;

  constructor(private readonly cfg: TelegramMessengerConfig) {}

  async start(): Promise<void> {
    const bot = createBot(this.cfg.botToken);
    this.bot = bot;

    this.buffer = new ImageGroupBuffer<PendingPhoto>(
      this.cfg.mediaGroupDebounceMs ?? 200,
      (items) => {
        if (items.length === 0) return;
        void (async () => {
          try {
            const datas = await Promise.all(items.map((i) => i.dataPromise));
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
            logger.error({ err: (e as Error).message }, "imageGroup flush failed");
          }
        })();
      },
    );

    bot.on("message:text", (ctx) => {
      const userId = ctx.from?.id;
      if (userId === undefined) return;
      if (this.cfg.allowedUserIds && !this.cfg.allowedUserIds.includes(userId)) {
        return;
      }
      const chatId = String(ctx.chat.id);
      const text = ctx.message.text;
      for (const l of this.textListeners) {
        l({ chatId, userId, username: ctx.from?.username, text });
      }
    });

    bot.on("callback_query:data", (ctx) => {
      const userId = ctx.from?.id;
      if (userId === undefined) return;
      if (this.cfg.allowedUserIds && !this.cfg.allowedUserIds.includes(userId)) {
        return;
      }
      const chatId = String(ctx.callbackQuery.message?.chat.id ?? ctx.chat?.id);
      if (!chatId) return;
      const msg: IncomingCallbackQuery = {
        chatId,
        userId,
        callbackQueryId: ctx.callbackQuery.id,
        data: ctx.callbackQuery.data,
      };
      for (const l of this.callbackListeners) l(msg);
    });

    bot.on("message:photo", (ctx) => {
      const userId = ctx.from?.id;
      if (userId === undefined) return;
      if (this.cfg.allowedUserIds && !this.cfg.allowedUserIds.includes(userId)) {
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
      dataPromise.catch(() => {});
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

    bot.start({ drop_pending_updates: true }).catch((e) => {
      logger.error({ err: (e as Error).message }, "grammy start failed");
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
  on(event: "callback_query", h: (m: IncomingCallbackQuery) => void): void;
  on(
    event: "text" | "image" | "imageGroup" | "callback_query",
    h: (m: never) => void,
  ): void {
    if (event === "text") {
      this.textListeners.push(h as (m: IncomingTextMessage) => void);
    } else if (event === "image") {
      this.imageListeners.push(h as (m: IncomingImageMessage) => void);
    } else if (event === "imageGroup") {
      this.imageGroupListeners.push(h as (m: IncomingImageGroup) => void);
    } else {
      this.callbackListeners.push(h as (m: IncomingCallbackQuery) => void);
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

  async sendInteractiveMessage(
    chatId: string,
    msg: InteractiveMessage,
  ): Promise<MessageHandle> {
    const keyboard = new InlineKeyboard();
    for (const btn of msg.buttons) {
      keyboard.text(btn.label, btn.id);
      keyboard.row();
    }
    const r = await this.requireBot().api.sendMessage(Number(chatId), msg.text, {
      parse_mode: this.toParseMode(msg.parseMode ?? this.cfg.parseMode),
      reply_markup: keyboard,
    });
    return { messageId: String(r.message_id) };
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.requireBot().api.answerCallbackQuery(callbackQueryId, { text });
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
    if (!this.bot) throw new Error("TelegramMessenger não iniciado");
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
