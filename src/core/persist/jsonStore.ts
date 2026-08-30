import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { logger } from "../../logger.js";

/**
 * text JSON text
 * - text
 * - text tmp + rename text
 * - text .tmp text
 */
export class JsonStore<T> {
  // text read text
  private cache?: T;
  // text write text
  private writing: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly defaults: T,
    private readonly validate?: (raw: unknown) => T,
  ) {}

  async readOrInit(): Promise<T> {
    if (this.cache !== undefined) return this.cache;
    await this.cleanupTmp();
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      this.cache = this.validate ? this.validate(parsed) : (parsed as T);
      return this.cache;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        await this.write(this.defaults);
        return this.defaults;
      }
      throw e;
    }
  }

  async read(): Promise<T> {
    if (this.cache !== undefined) return this.cache;
    return this.readOrInit();
  }

  async write(value: T): Promise<void> {
    this.cache = value;
    this.writing = this.writing.then(() => this.flush(value));
    return this.writing;
  }

  async update(fn: (current: T) => T | Promise<T>): Promise<T> {
    const current = await this.read();
    const next = await fn(current);
    await this.write(next);
    return next;
  }

  // text .tmp text renametextrename text
  private async flush(value: T): Promise<void> {
    // F-13textdataDir text session/reminder/userId text 0700text 0600text
    // text
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(tmp, this.filePath);
  }

  // text .tmp text
  private async cleanupTmp(): Promise<void> {
    const tmp = `${this.filePath}.tmp`;
    try {
      await stat(tmp);
      await unlink(tmp);
      logger.warn({ tmp }, "Removed stale tmp file");
    } catch {
      /* not exist; ignore */
    }
  }
}
