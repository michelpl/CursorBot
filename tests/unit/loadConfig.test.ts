import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../../src/config/loadConfig.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cfg-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.CURSOR_API_KEY;
});

describe("loadConfig", () => {
  it("loads minimal JSON with defaults", async () => {
    const p = join(dir, "config.json");
    await writeFile(
      p,
      JSON.stringify({
        telegram: { botToken: "T", allowedUserIds: [42] },
        cursor: { apiKey: "K" },
      }),
      "utf8",
    );
    const cfg = await loadConfig({ configPath: p });
    expect(cfg.telegram.botToken).toBe("T");
    expect(cfg.telegram.parseMode).toBe("HTML");
    expect(cfg.telegram.allowedUserIds).toEqual([42]);
    expect(cfg.cursor.apiKey).toBe("K");
    expect(cfg.cursor.agentCliPath).toBe("agent");
    expect(cfg.cursor.acpMode).toBe("agent");
    expect(cfg.paths.dataDir).toBe("./data");
  });

  it("env vars override file values", async () => {
    const p = join(dir, "config.json");
    await writeFile(
      p,
      JSON.stringify({
        telegram: { botToken: "T_FILE", allowedUserIds: [1] },
        cursor: { apiKey: "K_FILE" },
      }),
      "utf8",
    );
    process.env.TELEGRAM_BOT_TOKEN = "T_ENV";
    process.env.CURSOR_API_KEY = "K_ENV";
    const cfg = await loadConfig({ configPath: p });
    expect(cfg.telegram.botToken).toBe("T_ENV");
    expect(cfg.cursor.apiKey).toBe("K_ENV");
  });

  it("throws ConfigError on missing botToken", async () => {
    const p = join(dir, "config.json");
    await writeFile(
      p,
      JSON.stringify({
        telegram: { allowedUserIds: [1] },
        cursor: { apiKey: "K" },
      }),
      "utf8",
    );
    await expect(loadConfig({ configPath: p })).rejects.toThrow(/telegram\.botToken/);
  });

  it("requires non-empty allowedUserIds", async () => {
    const p = join(dir, "config.json");
    await writeFile(
      p,
      JSON.stringify({
        telegram: { botToken: "T", allowedUserIds: [] },
        cursor: { apiKey: "K" },
      }),
      "utf8",
    );
    await expect(loadConfig({ configPath: p })).rejects.toThrow(/allowedUserIds/);
  });

  it("M2 sections use schema defaults", async () => {
    const path = join(dir, "config.json");
    await writeFile(
      path,
      JSON.stringify({
        telegram: { botToken: "x", allowedUserIds: [1] },
        cursor: { apiKey: "y" },
      }),
      "utf8",
    );
    const cfg = await loadConfig({ configPath: path });
    expect(cfg.reminders.timezone).toBe("America/Sao_Paulo");
    expect(cfg.reminders.maxAheadDays).toBe(30);
    expect(cfg.attachments.maxFileSizeBytes).toBe(20 * 1024 * 1024);
    expect(cfg.images.defaultPromptSingle).toContain("Analyze");
    expect(cfg.images.mediaGroupDebounceMs).toBe(800);
    expect(cfg.rateLimit.sessionCreate.capacity).toBe(10);
  });
});
