import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AttachmentQueue } from "../../src/core/attachments/AttachmentQueue.js";
import { AttachmentDispatcher } from "../../src/core/attachments/AttachmentDispatcher.js";
import { StubMessenger } from "../helpers/StubMessenger.js";

describe("AttachmentDispatcher", () => {
  let dir: string;
  let queuePath: string;
  let pendingDir: string;
  let messenger: StubMessenger;
  let queue: AttachmentQueue;

  async function preparePending(name: string, content: Buffer): Promise<string> {
    const p = join(pendingDir, name);
    await writeFile(p, content);
    return p;
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ad-"));
    queuePath = join(dir, "queue.jsonl");
    pendingDir = join(dir, "pending");
    await mkdir(pendingDir);
    messenger = new StubMessenger();
    queue = new AttachmentQueue(queuePath);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("text flushtext sendImage / sendDocument text pending + text queue", async () => {
    const p1 = await preparePending("a.png", Buffer.from([1, 2, 3]));
    const p2 = await preparePending("b.pdf", Buffer.from([4, 5]));
    await queue.append({
      cwd: "/w",
      kind: "image",
      path: p1,
      caption: "c1",
      queuedAt: 1,
    });
    await queue.append({ cwd: "/w", kind: "file", path: p2, queuedAt: 2 });
    const d = new AttachmentDispatcher({
      queue,
      messenger,
      maxRetries: 3,
      maxPerFlush: 10,
      pendingRoot: pendingDir,
    });
    await d.flushForCwd("/w", "chat-1");
    expect(messenger.sentImages.length).toBe(1);
    expect(messenger.sentImages[0]!.caption).toBe("c1");
    expect(messenger.sentDocuments.length).toBe(1);
    expect((await queue.readAll()).length).toBe(0);
    await expect(stat(p1)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(p2)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("text cwd text", async () => {
    const p1 = await preparePending("a.png", Buffer.from([1]));
    await queue.append({ cwd: "/w1", kind: "image", path: p1, queuedAt: 1 });
    await queue.append({
      cwd: "/w2",
      kind: "image",
      path: "/never",
      queuedAt: 2,
    });
    const d = new AttachmentDispatcher({
      queue,
      messenger,
      maxRetries: 3,
      maxPerFlush: 10,
      pendingRoot: pendingDir,
    });
    await d.flushForCwd("/w1", "chat-1");
    expect(messenger.sentImages.length).toBe(1);
    const remain = await queue.readAll();
    expect(remain.length).toBe(1);
    expect(remain[0]!.cwd).toBe("/w2");
  });

  it("text entrytext maxRetries+1 text", async () => {
    const p1 = await preparePending("a.png", Buffer.from([1]));
    await queue.append({ cwd: "/w", kind: "image", path: p1, queuedAt: 1 });
    messenger.sendImageImpl = async () => {
      throw new Error("boom");
    };
    const d = new AttachmentDispatcher({
      queue,
      messenger,
      maxRetries: 2,
      maxPerFlush: 10,
      pendingRoot: pendingDir,
    });
    // text 1 text
    await d.flushForCwd("/w", "chat-1");
    expect((await queue.readAll()).length).toBe(1);
    // text 2 text
    await d.flushForCwd("/w", "chat-1");
    expect((await queue.readAll()).length).toBe(1);
    // text 3 text maxRetries=2text + text
    await d.flushForCwd("/w", "chat-1");
    expect(
      messenger.sentTexts.some((t) => t.text.includes("Failed to send attachment")),
    ).toBe(true);
    expect((await queue.readAll()).length).toBe(0);
  });

  it("pending text text text + text entry", async () => {
    await queue.append({
      cwd: "/w",
      kind: "image",
      path: "/never",
      queuedAt: 1,
    });
    const d = new AttachmentDispatcher({
      queue,
      messenger,
      maxRetries: 3,
      maxPerFlush: 10,
      pendingRoot: pendingDir,
    });
    await d.flushForCwd("/w", "chat-1");
    expect(messenger.sentImages.length).toBe(0);
    expect((await queue.readAll()).length).toBe(0);
  });

  // F-14text
  // text prompt injection / text queue.jsonl text
  //   { path: "/etc/passwd", kind: "image", cwd: <text cwd> }
  // textdispatcher text entry text text text evil text
  //      text entry text
  it("text entrytext evil text", async () => {
    // text pendingDir text"text"text/etc/passwd text
    const outsideDir = await mkdtemp(join(tmpdir(), "ad-outside-"));
    const evilFile = join(outsideDir, "victim.txt");
    await writeFile(evilFile, Buffer.from("important-content"));

    // text entrytext
    const goodFile = await preparePending("good.png", Buffer.from([1, 2, 3]));

    await queue.append({
      cwd: "/w",
      kind: "image",
      path: evilFile,
      caption: "owned",
      queuedAt: 1,
    });
    await queue.append({
      cwd: "/w",
      kind: "image",
      path: goodFile,
      caption: "ok",
      queuedAt: 2,
    });

    const d = new AttachmentDispatcher({
      queue,
      messenger,
      maxRetries: 3,
      maxPerFlush: 10,
      pendingRoot: pendingDir,
    });
    await d.flushForCwd("/w", "chat-1");

    // text unlinktext
    await expect(stat(evilFile)).resolves.toBeDefined();
    // textmessenger text
    expect(messenger.sentImages.length).toBe(1);
    expect(messenger.sentImages[0]!.caption).toBe("ok");
    // text sendTexttext
    expect(messenger.sentTexts.length).toBe(0);
    // text entry text text droptext text rejecttext
    expect((await queue.readAll()).length).toBe(0);

    // text outsideDir
    await rm(outsideDir, { recursive: true, force: true });
  });

  // F-14textpendingRoot text
  // text startsWith() text sep text
  //   pendingRoot = "/tmp/X/pending"
  //   entry.path  = "/tmp/X/pending_evil/file" text "/tmp/X/pending_evil/file".startsWith("/tmp/X/pending") === true
  // text "pendingRoot + sep" text / text path.relative text
  it("text pendingRoot text pathtext startsWith text", async () => {
    const sibling = `${pendingDir}_evil`;
    await mkdir(sibling, { recursive: true });
    const evilFile = join(sibling, "x.png");
    await writeFile(evilFile, Buffer.from([1, 2, 3]));

    await queue.append({
      cwd: "/w",
      kind: "image",
      path: evilFile,
      queuedAt: 1,
    });
    const d = new AttachmentDispatcher({
      queue,
      messenger,
      maxRetries: 3,
      maxPerFlush: 10,
      pendingRoot: pendingDir,
    });
    await d.flushForCwd("/w", "chat-1");

    await expect(stat(evilFile)).resolves.toBeDefined();
    expect(messenger.sentImages.length).toBe(0);
    expect((await queue.readAll()).length).toBe(0);

    await rm(sibling, { recursive: true, force: true });
  });
});
