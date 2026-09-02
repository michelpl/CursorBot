import { readFile, unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { IMessenger } from "../messenger/IMessenger.js";
import { logger } from "../../logger.js";
import type { AttachmentQueue, AttachmentEntry } from "./AttachmentQueue.js";

export interface AttachmentDispatcherOptions {
  queue: AttachmentQueue;
  messenger: IMessenger;
  // text entry text attempt textattempt > maxRetries text + text
  maxRetries: number;
  // text flushForCwd text sanity text
  maxPerFlush: number;
  // F-14text pending text entry.path text
  // text fs.realpath(entry.path) text entry text read/unlinktext
  // text entry text text textwarn text
  pendingRoot: string;
}

/**
 * text run.wait() text flushForCwdtext attach CLI text
 *
 * text
 * - text entry.path text attemptCounttext
 *   text
 * - text attempt++text queuetext flush text
 * - attempt > maxRetriestext maxRetries+1 text sendText text queue text
 *
 * text
 * - text / textunlink pending text + text
 * - pending textagent text / text
 */
export class AttachmentDispatcher {
  private readonly attempts = new Map<string, number>();
  // text resolve text pendingRoottext entry text resolve
  private readonly resolvedPendingRoot: string;

  constructor(private readonly opts: AttachmentDispatcherOptions) {
    this.resolvedPendingRoot = resolve(this.opts.pendingRoot);
  }

  // F-14text entry.path text pendingRoot text
  // text resolve() text `..` text `root + sep` text
  // text startsWith text sep text root="/a/pending"
  // text "/a/pending_evil/x" text
  private isWithinPendingRoot(p: string): boolean {
    const resolvedPath = resolve(p);
    if (resolvedPath === this.resolvedPendingRoot) return false; // root text
    return resolvedPath.startsWith(this.resolvedPendingRoot + sep);
  }

  // text cwd text entry text queue
  async flushForCwd(cwd: string, chatId: string): Promise<void> {
    const all = await this.opts.queue.readAll();
    const own = all.filter((e) => e.cwd === cwd);
    if (own.length === 0) return;

    if (own.length > this.opts.maxPerFlush) {
      // text warn text agent / text
      logger.warn(
        { cwd, n: own.length, cap: this.opts.maxPerFlush },
        "queue text maxPerFlush",
      );
    }

    const sortedOwn = [...own].sort((a, b) => a.queuedAt - b.queuedAt);
    const survivors: AttachmentEntry[] = []; // text cwd text
    const others = all.filter((e) => e.cwd !== cwd); // text cwd text

    for (const e of sortedOwn) {
      // F-14text IO text
      // text entry text prompt injection / text
      //   text
      // text NOT unlink text text pendingRoot text
      //       text
      if (!this.isWithinPendingRoot(e.path)) {
        logger.warn(
          { path: e.path, pendingRoot: this.resolvedPendingRoot, cwd },
          "F-14: entry.path text pendingRoottext",
        );
        this.attempts.delete(e.path);
        continue; // text survivors text text
      }

      const result = await this.tryDeliver(e, chatId);
      if (result === "delivered" || result === "drop") {
        // text pending text + text entry
        try {
          await unlink(e.path);
        } catch {
          // text
        }
        this.attempts.delete(e.path);
      } else {
        // retrytext flush
        survivors.push(e);
      }
    }

    await this.opts.queue.rewrite([...others, ...survivors]);
  }

  // text 'delivered' / 'retry' / 'drop'
  private async tryDeliver(
    e: AttachmentEntry,
    chatId: string,
  ): Promise<"delivered" | "retry" | "drop"> {
    // pending text text droptextagent text / text
    let buf: Buffer;
    try {
      buf = await readFile(e.path);
    } catch {
      logger.warn({ path: e.path }, "pending text entry");
      return "drop";
    }

    try {
      if (e.kind === "image") {
        await this.opts.messenger.sendImage(
          chatId,
          { data: buf, mimeType: "image/jpeg", filename: pickName(e.path) },
          e.caption,
        );
      } else {
        await this.opts.messenger.sendDocument(
          chatId,
          { data: buf, filename: pickName(e.path) },
          e.caption,
        );
      }
      return "delivered";
    } catch (err) {
      const attempt = (this.attempts.get(e.path) ?? 0) + 1;
      this.attempts.set(e.path, attempt);
      logger.error(
        { err: (err as Error).message, attempt, path: e.path },
        "text",
      );
      if (attempt > this.opts.maxRetries) {
        // text queue
        try {
          await this.opts.messenger.sendText(
            chatId,
            `Failed to send attachment after ${attempt} attempts: ${pickName(e.path)}`,
          );
        } catch {
          /* sendText text flush text entry text drop */
        }
        return "drop";
      }
      return "retry";
    }
  }
}

// text path text segment text filenametext isoTs text
// pending text`${isoTs}-${basename}`text '-' text
function pickName(p: string): string {
  const last = p.split("/").pop() ?? p;
  const dash = last.search(/-\D/);
  if (dash > 0) return last.slice(dash + 1);
  return last;
}
