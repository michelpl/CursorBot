import type {
  IncomingTextMessage,
  IncomingImageMessage,
  IncomingImageGroup,
  MessageHandle,
  SendOptions,
  ImagePayload,
  FilePayload,
} from "./types.js";

/**
 * text
 * - texton("text"|"image"|"imageGroup", handler)
 * - textsendText / editText / sendImage / sendDocument / sendTyping
 *
 * text / Telegram / text IM textAgentOrchestrator text
 *
 * text image vs imageGrouptext
 * - "image"textM1 textM2 text TelegramMessenger text emit
 * - "imageGroup"textM2 text 1..N text albumtextcaption text
 */
export interface IMessenger {
  start(): Promise<void>;
  stop(): Promise<void>;

  on(event: "text", h: (msg: IncomingTextMessage) => void): void;
  on(event: "image", h: (msg: IncomingImageMessage) => void): void;
  on(event: "imageGroup", h: (msg: IncomingImageGroup) => void): void;

  sendText(chatId: string, text: string, opts?: SendOptions): Promise<MessageHandle>;
  editText(chatId: string, messageId: string, text: string, opts?: SendOptions): Promise<void>;
  sendImage(chatId: string, image: ImagePayload, caption?: string): Promise<MessageHandle>;
  sendDocument(chatId: string, file: FilePayload, caption?: string): Promise<MessageHandle>;

  sendTyping(chatId: string): Promise<void>;
}
