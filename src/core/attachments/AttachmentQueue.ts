import { mkdir, readFile, rename, writeFile, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { logger } from "../../logger.js";
import { z } from "zod";

export interface AttachmentEntry {
  cwd: string;
  kind: "image" | "file";
  path: string;
  caption?: string;
  queuedAt: number;
}

const AttachmentEntrySchema = z.object({
  cwd: z.string(),
  kind: z.union([z.literal("image"), z.literal("file")]),
  path: z.string(),
  caption: z.string().optional(),
  queuedAt: z.number(),
});

/**
 * text (jsonl)text
 * - appendtextCLI text fs.appendFiletext O_APPEND text
 *   text entry < POSIX PIPE_BUF 4096 text caption text
 * - readAlltext readFile + text + JSON.parsetext warn
 * - rewritetexttmp + rename atomic text dispatcher flush text
 *
 * text jsonl text JSONtext CLI text append text
 */
export class AttachmentQueue {
  constructor(private readonly filePath: string) {}

  // text
  async append(entry: AttachmentEntry): Promise<void> {
    // F-13textqueue.jsonl text chatId / cwd / text 0700/0600
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    await appendFile(this.filePath, JSON.stringify(entry) + "\n", {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  // text
  async readAll(): Promise<AttachmentEntry[]> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
    const out: AttachmentEntry[] = [];
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        out.push(AttachmentEntrySchema.parse(JSON.parse(t)) as AttachmentEntry);
      } catch {
        // text / shape text
        logger.warn({ line: t.slice(0, 200) }, "queue text");
      }
    }
    return out;
  }

  // text cwd text dispatcher text flushForCwd text
  async filterByCwd(cwd: string): Promise<AttachmentEntry[]> {
    const all = await this.readAll();
    return all.filter((e) => e.cwd === cwd);
  }

  // text entries texttmp + renametext
  async rewrite(items: AttachmentEntry[]): Promise<void> {
    // F-13text append textrewrite text 0700/0600
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const content =
      items.length === 0
        ? ""
        : items.map((i) => JSON.stringify(i)).join("\n") + "\n";
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, content, { encoding: "utf8", mode: 0o600 });
    await rename(tmp, this.filePath);
  }
}
