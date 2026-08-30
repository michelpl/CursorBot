import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonStore } from "../../src/core/persist/jsonStore.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "jsonstore-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

interface Foo {
  x: number;
  y?: string;
}

describe("JsonStore", () => {
  it("readOrInit text", async () => {
    const store = new JsonStore<Foo>(join(dir, "foo.json"), { x: 0 });
    const data = await store.readOrInit();
    expect(data).toEqual({ x: 0 });
    const onDisk = JSON.parse(await readFile(join(dir, "foo.json"), "utf8"));
    expect(onDisk).toEqual({ x: 0 });
  });

  it("write text read text", async () => {
    const store = new JsonStore<Foo>(join(dir, "foo.json"), { x: 0 });
    await store.readOrInit();
    await store.write({ x: 7, y: "hi" });
    const back = await store.read();
    expect(back).toEqual({ x: 7, y: "hi" });
  });

  it("text *.tmp", async () => {
    const store = new JsonStore<Foo>(join(dir, "foo.json"), { x: 0 });
    await store.write({ x: 99 });
    const onDisk = JSON.parse(await readFile(join(dir, "foo.json"), "utf8"));
    expect(onDisk).toEqual({ x: 99 });
    await expect(stat(join(dir, "foo.json.tmp"))).rejects.toThrow();
  });

  it("text *.tmp text", async () => {
    await writeFile(join(dir, "foo.json.tmp"), "garbage", "utf8");
    const store = new JsonStore<Foo>(join(dir, "foo.json"), { x: 1 });
    await store.readOrInit();
    await expect(stat(join(dir, "foo.json.tmp"))).rejects.toThrow();
  });

  it("update text", async () => {
    const store = new JsonStore<Foo>(join(dir, "foo.json"), { x: 1 });
    await store.readOrInit();
    await store.update((cur) => ({ ...cur, x: cur.x + 10 }));
    expect((await store.read()).x).toBe(11);
  });

  it("F-12: text validator text JSON shape text", async () => {
    const target = join(dir, "bad.json");
    await writeFile(target, JSON.stringify({ x: "not-number" }), "utf8");
    const store = new JsonStore<Foo>(join(dir, "bad.json"), { x: 0 }, (raw) => {
      if (
        typeof raw === "object" &&
        raw !== null &&
        typeof (raw as { x?: unknown }).x === "number"
      ) {
        return raw as Foo;
      }
      throw new Error("invalid Foo");
    });
    await expect(store.readOrInit()).rejects.toThrow("invalid Foo");
  });

  // F-13textJsonStore text 0600text owner text
  // text dataDir text / reminder text / text
  // text 0644 text
  it.skipIf(process.platform === "win32")(
    "F-13: write text mode text 0o600text owner text",
    async () => {
      const target = join(dir, "perm.json");
      const store = new JsonStore<Foo>(target, { x: 0 });
      await store.write({ x: 1 });
      const st = await stat(target);
      expect(st.mode & 0o777).toBe(0o600);
    },
  );

  // F-13text JsonStore text 0o700
  it.skipIf(process.platform === "win32")(
    "F-13: text mkdir text mode text 0o700",
    async () => {
      const sub = join(dir, "subdir");
      const store = new JsonStore<Foo>(join(sub, "perm.json"), { x: 0 });
      await store.write({ x: 1 });
      const st = await stat(sub);
      expect(st.mode & 0o777).toBe(0o700);
    },
  );
});
