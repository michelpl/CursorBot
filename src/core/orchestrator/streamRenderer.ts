import type { IMessenger } from "../messenger/IMessenger.js";
import { markdownToHtml } from "../render/markdownToHtml.js";

export interface StreamRendererOptions {
  // text pushText text editMessageText text
  throttleMs: number;
  // text raw markdown text
  // HTML text 3000text
  maxLen: number;
}

/**
 * text assistant text + text
 * text maxLen text
 *
 * textM2 polishtext
 * - textBuffer text agent text markdowntextrawtext escape / text
 * - status / finalizeExtra text HTML text agenttext
 * - compose() text textBuffer text markdownToHtml(textBuffer)text
 *   text chunk text
 *
 * text
 * - editMessageText text Telegram text RPS text chunk text
 * - text rotate()textfinalize text text placeholder text text
 * - text timertext
 * - markdownToHtml text fallback text escapeHtmltext
 *   text streaming text
 */
export class StreamRenderer {
  private currentMsgId?: string;
  private status: string = "";
  // textraw markdowntext HTML
  private textBuffer: string = "";
  // finalize text HTML text "(text)" / text markdownToHtml
  private finalizeExtra: string = "";
  private flushTimer?: NodeJS.Timeout;
  private dirty = false;
  private finalized = false;

  constructor(
    private readonly messenger: IMessenger,
    private readonly chatId: string,
    private readonly opts: StreamRendererOptions,
  ) {}

  async start(initialPlaceholder: string): Promise<void> {
    this.status = initialPlaceholder;
    const handle = await this.messenger.sendText(this.chatId, this.compose());
    this.currentMsgId = handle.messageId;
  }

  setStatus(line: string): void {
    this.status = line;
    this.dirty = true;
    this.scheduleFlush();
  }

  async pushText(chunk: string): Promise<void> {
    // textBuffer text chunk text text texthead text flush + rotatetextrest text
    // maxLen text raw textHTML text
    if (this.textBuffer.length + chunk.length > this.opts.maxLen) {
      const remaining = Math.max(0, this.opts.maxLen - this.textBuffer.length);
      const head = chunk.slice(0, remaining);
      const rest = chunk.slice(remaining);
      this.textBuffer += head;
      this.dirty = true;
      await this.flushNow();
      await this.rotate();
      if (rest.length > 0) {
        await this.pushText(rest);
      }
      return;
    }
    this.textBuffer += chunk;
    this.dirty = true;
    this.scheduleFlush();
  }

  async finalize(extra?: string): Promise<void> {
    this.finalized = true;
    this.status = "";
    if (extra) this.finalizeExtra += extra;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    // finalize text messenger text
    // text dirty=falsetext cancel text pushTexttext flush text
    // text / text extra text
    this.dirty = true;
    await this.flushNow();
  }

  // text status / textBuffer / finalizeExtra text
  // texttextBuffer text markdownToHtmltextstatus / finalizeExtra text HTML text
  private compose(): string {
    const lines: string[] = [];
    if (this.status) {
      lines.push(this.status, "");
    }
    if (this.textBuffer) {
      lines.push(this.renderTextBufferSafely());
    }
    if (this.finalizeExtra) {
      lines.push(this.finalizeExtra);
    }
    if (lines.length === 0) lines.push("text");
    return lines.join("\n");
  }

  // markdownToHtml text textBuffertext escapeHtml text
  private renderTextBufferSafely(): string {
    try {
      return markdownToHtml(this.textBuffer);
    } catch {
      return escapeHtmlFallback(this.textBuffer);
    }
  }

  // text dirty text throttle text
  private scheduleFlush(): void {
    if (this.finalized) return;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      void this.flushNow();
    }, this.opts.throttleMs);
  }

  // text flushtext throttletext finalize text rotate text
  private async flushNow(): Promise<void> {
    if (!this.dirty || !this.currentMsgId) return;
    this.dirty = false;
    await this.messenger.editText(this.chatId, this.currentMsgId, this.compose());
  }

  // texttextBuffer / finalizeExtra text text text placeholder text messageId
  private async rotate(): Promise<void> {
    this.textBuffer = "";
    this.finalizeExtra = "";
    this.dirty = false;
    const handle = await this.messenger.sendText(this.chatId, "text continuing...");
    this.currentMsgId = handle.messageId;
    // text dirty text push text
    this.dirty = true;
  }
}

// markdownToHtml text escapetext
function escapeHtmlFallback(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
