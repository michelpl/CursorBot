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
  it("text JSON text", async () => {
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
    expect(cfg.cursor.defaultModel.id).toBe("default");
    expect(cfg.cursor.settingSources).toEqual(["project", "user"]);
    expect(cfg.paths.dataDir).toBe("./data");
  });

  it("text", async () => {
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

  it("text ConfigError", async () => {
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

  it("allowedUserIds text", async () => {
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

  // M2textreminders / attachments / images text
  it("M2 text reminders / attachments / images text default", async () => {
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
    expect(cfg.reminders.timezone).toBe("Asia/Shanghai");
    expect(cfg.reminders.maxAheadDays).toBe(30);
    expect(cfg.attachments.maxFileSizeBytes).toBe(20 * 1024 * 1024);
    expect(cfg.attachments.maxAttachmentsPerFlush).toBe(10);
    expect(cfg.attachments.maxRetries).toBe(3);
    expect(cfg.images.maxImagesPerPrompt).toBe(8);
    expect(cfg.images.defaultPromptSingle).toBe("text");
    expect(cfg.images.defaultPromptMulti).toBe("text");
    expect(cfg.images.mediaGroupDebounceMs).toBe(800);
  });
});
