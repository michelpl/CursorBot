import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getServiceStatus, stopService } from "../../src/bin/cli.js";
import { serviceLockPath } from "../../src/core/service/ServiceLock.js";

let dir: string;
let configPath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cli-status-"));
  configPath = join(dir, "config.json");
  await writeFile(
    configPath,
    JSON.stringify({
      telegram: { botToken: "123:abc", allowedUserIds: [1] },
      cursor: { apiKey: "key_test" },
      paths: { dataDir: join(dir, "data") },
    }),
    "utf8",
  );
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("getServiceStatus", () => {
  it("returns not running when no lock", async () => {
    const status = await getServiceStatus(configPath);
    expect(status.running).toBe(false);
  });

  it("returns running when lock has live pid", async () => {
    const dataDir = join(dir, "data");
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      serviceLockPath(dataDir),
      JSON.stringify({
        pid: process.pid,
        startedAt: new Date().toISOString(),
        configPath,
        cwd: dir,
        startedBy: "cli",
      }),
      "utf8",
    );
    const status = await getServiceStatus(configPath);
    expect(status.running).toBe(true);
    expect(status.pid).toBe(process.pid);
  });
});

describe("stopService", () => {
  it("reports not running when no lock", async () => {
    const result = await stopService(configPath);
    expect(result.stopped).toBe(true);
    expect(result.message).toContain("not running");
  });

  it("clears stale lock", async () => {
    const dataDir = join(dir, "data");
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      serviceLockPath(dataDir),
      JSON.stringify({
        pid: 2_147_483_646,
        startedAt: "2020-01-01T00:00:00.000Z",
        configPath,
        cwd: dir,
        startedBy: "cli",
      }),
      "utf8",
    );
    const result = await stopService(configPath);
    expect(result.stopped).toBe(true);
    expect(result.message).toContain("stale");
  });
});
