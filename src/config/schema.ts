import { z } from "zod";

// Analyze this image schemaAnalyze these images JSON text + text
// text undefinedtext
export const ConfigSchema = z.object({
  telegram: z.object({
    botToken: z.string().min(1),
    allowedUserIds: z.array(z.number().int()).min(1),
    parseMode: z.enum(["HTML", "Markdown", "plain"]).default("HTML"),
  }),
  cursor: z.object({
    apiKey: z.string().min(1),
    defaultModel: z
      .object({
        // Cursor SDK text"text"text id text "default"text "auto"text ConfigurationError text
        id: z.string().default("default"),
        params: z
          .array(z.object({ id: z.string(), value: z.string() }))
          .default([]),
      })
      .default({ id: "default", params: [] }),
    settingSources: z
      .array(z.enum(["project", "user", "team", "mdm", "plugins", "all"]))
      .default(["project", "user"]),
    // F-10text Cursor SDK textCWE-269 text
    // text ~/.cursor/sandbox.json text <workspace>/.cursor/sandbox.json text
    //   - type: "workspace_readwrite"text/ "workspace_readonly" / "insecure_none"
    //   - networkPolicy: text/text SSRF / cloud metadatatext
    //   - additionalReadonlyPaths / additionalReadwritePaths
    // text npm install / text config.json text falsetext
    sandboxOptions: z
      .object({ enabled: z.boolean().default(true) })
      .default({ enabled: true }),
  }),
  workspaces: z
    .object({
      autoRegisterCwd: z.boolean().default(true),
      // F-07text/ws add text cwd + text workspace text
      allowedRoots: z.array(z.string()).default([]),
    })
    .default({ autoRegisterCwd: true, allowedRoots: [] }),
  mcpServers: z.record(z.string(), z.unknown()).optional(),
  paths: z
    .object({ dataDir: z.string().default("./data") })
    .default({ dataDir: "./data" }),
  logging: z
    .object({ level: z.enum(["debug", "info", "warn", "error"]).default("info") })
    .default({ level: "info" }),
  // M2text + text
  reminders: z
    .object({
      timezone: z.string().default("Asia/Shanghai"),
      maxAheadDays: z.number().int().min(1).max(365).default(30),
    })
    .default({ timezone: "Asia/Shanghai", maxAheadDays: 30 }),
  // M2text
  attachments: z
    .object({
      maxFileSizeBytes: z
        .number()
        .int()
        .min(1024)
        .max(50 * 1024 * 1024)
        .default(20 * 1024 * 1024),
      maxAttachmentsPerFlush: z.number().int().min(1).max(50).default(10),
      maxRetries: z.number().int().min(0).max(5).default(3),
    })
    .default({
      maxFileSizeBytes: 20 * 1024 * 1024,
      maxAttachmentsPerFlush: 10,
      maxRetries: 3,
    }),
  // M2text prompttextmedia_group debouncetext
  images: z
    .object({
      maxImagesPerPrompt: z.number().int().min(1).max(16).default(8),
      defaultPromptSingle: z.string().default("text"),
      defaultPromptMulti: z.string().default("text"),
      // 800ms textgrammy text update text 50-200mstext 300-500ms text
      // 200ms textspec text"text album"text800ms text
      mediaGroupDebounceMs: z.number().int().min(50).max(2000).default(800),
    })
    .default({
      maxImagesPerPrompt: 8,
      defaultPromptSingle: "text",
      defaultPromptMulti: "text",
      mediaGroupDebounceMs: 800,
    }),
  // F-06text captext config.json
  // - messagetext messenger text owner text + text
  // - agentCreatetextcached miss text Agent.create / resume textcached text
  // - reminderstext reminder text /remind add text
  rateLimit: z
    .object({
      message: z
        .object({
          capacity: z.number().int().min(1).default(4),
          refillPerSec: z.number().min(0.1).default(2),
        })
        .default({ capacity: 4, refillPerSec: 2 }),
      agentCreate: z
        .object({
          capacity: z.number().int().min(1).default(10),
          refillPerSec: z.number().min(0.01).default(10 / 60),
        })
        .default({ capacity: 10, refillPerSec: 10 / 60 }),
      reminders: z
        .object({ maxPerUser: z.number().int().min(1).default(100) })
        .default({ maxPerUser: 100 }),
    })
    .default({
      message: { capacity: 4, refillPerSec: 2 },
      agentCreate: { capacity: 10, refillPerSec: 10 / 60 },
      reminders: { maxPerUser: 100 },
    }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

// text
export class ConfigError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ConfigError";
  }
}
