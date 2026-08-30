import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AttachmentQueue } from "../../src/core/attachments/AttachmentQueue.js";

describe("AttachmentQueue", () => {
  let dir: string;
  let queuePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "aq-"));
    queuePath = join(dir, "queue.jsonl");
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("readAlltext", async () => {
    const q = new AttachmentQueue(queuePath);
    expect(await q.readAll()).toEqual([]);
  });

  it("append + readAlltext", async () => {
    const q = new AttachmentQueue(queuePath);
    await q.append({
      cwd: "/a",
      kind: "image",
      path: "/p1",
      queuedAt: 1,
    });
    await q.append({
      cwd: "/b",
      kind: "file",
      path: "/p2",
      caption: "x",
      queuedAt: 2,
    });
    const items = await q.readAll();
    expect(items).toEqual([
      { cwd: "/a", kind: "image", path: "/p1", queuedAt: 1 },
      { cwd: "/b", kind: "file", path: "/p2", caption: "x", queuedAt: 2 },
    ]);
  });

  it("filterByCwdtext cwd text", async () => {
    const q = new AttachmentQueue(queuePath);
    await q.append({ cwd: "/a", kind: "image", path: "/1", queuedAt: 1 });
    await q.append({ cwd: "/b", kind: "image", path: "/2", queuedAt: 2 });
    await q.append({ cwd: "/a", kind: "file", path: "/3", queuedAt: 3 });
    expect(await q.filterByCwd("/a")).toEqual([
      { cwd: "/a", kind: "image", path: "/1", queuedAt: 1 },
      { cwd: "/a", kind: "file", path: "/3", queuedAt: 3 },
    ]);
  });

  it("rewritetextatomic text", async () => {
    const q = new AttachmentQueue(queuePath);
    await q.append({ cwd: "/a", kind: "image", path: "/1", queuedAt: 1 });
    await q.append({ cwd: "/a", kind: "image", path: "/2", queuedAt: 2 });
    await q.rewrite([{ cwd: "/a", kind: "image", path: "/2", queuedAt: 2 }]);
    expect(await q.readAll()).toEqual([
      { cwd: "/a", kind: "image", path: "/2", queuedAt: 2 },
    ]);
  });

  // F-13textAttachmentQueue text jsonl text 0600
  // queue.jsonl text chatId / cwd / text 0644 text
  it.skipIf(process.platform === "win32")(
    "F-13: append text mode text 0o600",
    async () => {
      const q = new AttachmentQueue(queuePath);
      await q.append({ cwd: "/a", kind: "image", path: "/p1", queuedAt: 1 });
      const st = await stat(queuePath);
      expect(st.mode & 0o777).toBe(0o600);
    },
  );

  // F-13textrewrite text tmp + renametextrename text mode text 0o600
  it.skipIf(process.platform === "win32")(
    "F-13: rewrite text mode text 0o600",
    async () => {
      const q = new AttachmentQueue(queuePath);
      await q.append({ cwd: "/a", kind: "image", path: "/p1", queuedAt: 1 });
      await q.rewrite([
        { cwd: "/a", kind: "image", path: "/q", queuedAt: 1 },
      ]);
      const st = await stat(queuePath);
      expect(st.mode & 0o777).toBe(0o600);
    },
  );

  // F-13textAttachmentQueue text 0o700
  it.skipIf(process.platform === "win32")(
    "F-13: text mkdir text mode text 0o700",
    async () => {
      const sub = join(dir, "nested");
      const q = new AttachmentQueue(join(sub, "queue.jsonl"));
      await q.append({ cwd: "/a", kind: "image", path: "/p1", queuedAt: 1 });
      const st = await stat(sub);
      expect(st.mode & 0o777).toBe(0o700);
    },
  );

  it("text / text", async () => {
    await writeFile(
      queuePath,
      [
        '{"cwd":"/a","kind":"image","path":"/p1","queuedAt":1}',
        "",
        "not-json",
        '{"cwd":"/a","kind":"file","path":"/p2","queuedAt":2}',
      ].join("\n"),
    );
    const q = new AttachmentQueue(queuePath);
    const items = await q.readAll();
    expect(items.length).toBe(2);
    expect(items[0]!.path).toBe("/p1");
    expect(items[1]!.path).toBe("/p2");
  });
});
