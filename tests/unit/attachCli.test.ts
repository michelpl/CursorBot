import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  stat,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const exec = promisify(execFile);

// Use local tsx binary (npx may be unavailable in CI/sandbox)
const TSX = resolve("node_modules/tsx/dist/cli.mjs");
const NODE = process.execPath;
const ARGS = (entry: string, ...rest: string[]): string[] => [
  TSX,
  resolve("src/tools", entry),
  ...rest,
];

// text spawn text tsx text
const SLOW = 30000;

describe("attach CLItextspawntext", () => {
  let dir: string;
  let dataDir: string;
  let workDir: string;
  let imgPath: string;

  beforeEach(async () => {
    // macOS text /var/folders text /private/var/folders text symlinktext
    // text process.cwd() text realpathtext realpath text
    dir = await realpath(await mkdtemp(join(tmpdir(), "att-")));
    dataDir = join(dir, "data");
    workDir = join(dir, "work");
    await mkdir(dataDir);
    await mkdir(workDir);
    imgPath = join(workDir, "x.png");
    await writeFile(imgPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function runWithEnv(
    entry: string,
    ...rest: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    return exec(NODE, ARGS(entry, ...rest), {
      cwd: workDir,
      env: { ...process.env, CURSOR_SUPERVISOR_DATA_DIR: dataDir },
    });
  }

  it(
    "attach-image text pending + queue text",
    { timeout: SLOW },
    async () => {
      await runWithEnv("attach-image.ts", imgPath, "--caption", "hi");
      const queueRaw = await readFile(
        join(dataDir, "attachments", "queue.jsonl"),
        "utf8",
      );
      const lines = queueRaw.trim().split("\n");
      expect(lines.length).toBe(1);
      const entry = JSON.parse(lines[0]!);
      expect(entry.kind).toBe("image");
      expect(entry.cwd).toBe(workDir);
      expect(entry.caption).toBe("hi");
      // pending text
      await stat(entry.path);
      // F-13: pending text mode text 0o600
      // queue.jsonl text 0o600textpending text 0o700
      if (process.platform !== "win32") {
        const pendingFileSt = await stat(entry.path);
        expect(pendingFileSt.mode & 0o777).toBe(0o600);
        const queueSt = await stat(join(dataDir, "attachments", "queue.jsonl"));
        expect(queueSt.mode & 0o777).toBe(0o600);
        const pendingDirSt = await stat(join(dataDir, "attachments", "pending"));
        expect(pendingDirSt.mode & 0o777).toBe(0o700);
      }
    },
  );

  it(
    "attach-file text",
    { timeout: SLOW },
    async () => {
      const pdf = join(workDir, "y.pdf");
      await writeFile(pdf, "%PDF-1.4");
      await runWithEnv("attach-file.ts", pdf);
      const queueRaw = await readFile(
        join(dataDir, "attachments", "queue.jsonl"),
        "utf8",
      );
      const entry = JSON.parse(queueRaw.trim());
      expect(entry.kind).toBe("file");
    },
  );

  it("text text exit 1", { timeout: SLOW }, async () => {
    await expect(
      runWithEnv("attach-image.ts", "/nonexistent.png"),
    ).rejects.toMatchObject({ code: 1 });
  });

  it("missing data-dir marker exits 1", { timeout: SLOW }, async () => {
    await expect(
      exec(NODE, ARGS("attach-image.ts", imgPath), { cwd: workDir }),
    ).rejects.toMatchObject({ code: 1 });
  });
});
