import { join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { loadConfig } from "../config/loadConfig.js";
import { logger } from "../logger.js";
import { TelegramMessenger } from "../adapters/telegram/TelegramMessenger.js";
import { WorkspaceRegistry } from "../core/workspace/WorkspaceRegistry.js";
import { SessionStore } from "../core/session/SessionStore.js";
import { AccessControl } from "../core/access/AccessControl.js";
import { AgentOrchestrator } from "../core/orchestrator/AgentOrchestrator.js";
import { CursorSdkRuntime } from "../core/orchestrator/cursorSdkRuntime.js";
import { AttachmentQueue } from "../core/attachments/AttachmentQueue.js";
import { AttachmentDispatcher } from "../core/attachments/AttachmentDispatcher.js";
import { ReminderStore } from "../core/reminders/ReminderStore.js";
import { ReminderQuota } from "../core/reminders/ReminderQuota.js";
import { ReminderScheduler } from "../core/reminders/ReminderScheduler.js";
import { parseCommand } from "../commands/parser.js";
import { dispatchCommand } from "../commands/dispatch.js";
import { parseForcePrefix } from "../core/orchestrator/busyPolicy.js";
import { sanitizeForOutput } from "../util/sanitize.js";
import { RateLimiter } from "../core/rateLimit/RateLimiter.js";
import { rateLimitGuard } from "./wiring/rateLimitGuard.js";

// cursorbot textM1 + M2text config text text text text long-polling
async function main(): Promise<void> {
  const cfg = await loadConfig({});
  const dataDir = cfg.paths.dataDir;
  // F-13textdataDir text session/reminder/text 0o700
  await mkdir(dataDir, { recursive: true, mode: 0o700 });

  const registry = new WorkspaceRegistry(join(dataDir, "workspaces.json"));
  await registry.init({
    autoRegisterCwd: cfg.workspaces.autoRegisterCwd,
    cwd: process.cwd(),
  });

  const session = new SessionStore(join(dataDir, "sessions.json"));
  await session.init();

  // M2text dataDir text active workspace text .cursorbot/data-dir.txt
  // text attach CLI text agent text cwd text dataDirtext
  // text
  const writeClawMarker = async (wsPath: string): Promise<void> => {
    try {
      const markerDir = join(wsPath, ".cursorbot");
      // F-13textmarker text dataDir text/text
      // text 0o700/0o600text
      await mkdir(markerDir, { recursive: true, mode: 0o700 });
      const abs = resolve(dataDir);
      await writeFile(join(markerDir, "data-dir.txt"), abs, {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch (e) {
      logger.warn(
        { err: (e as Error).message, wsPath },
        ".cursorbot/data-dir.txt text",
      );
    }
  };

  const access = new AccessControl(cfg.telegram.allowedUserIds);
  const messenger = new TelegramMessenger({
    botToken: cfg.telegram.botToken,
    parseMode: cfg.telegram.parseMode,
    allowedUserIds: cfg.telegram.allowedUserIds,
    // M2: text debounce text album text
    mediaGroupDebounceMs: cfg.images.mediaGroupDebounceMs,
    // F-05: text attachments.maxFileSizeBytes text schema text
    maxFileSizeBytes: cfg.attachments.maxFileSizeBytes,
  });
  const runtime = new CursorSdkRuntime(cfg.cursor.apiKey);

  // M2: text queue + dispatcher
  const queue = new AttachmentQueue(
    join(dataDir, "attachments", "queue.jsonl"),
  );
  // F-14text pending text dispatchertext entry.path text
  const pendingRoot = join(dataDir, "attachments", "pending");
  const dispatcher = new AttachmentDispatcher({
    queue,
    messenger,
    maxRetries: cfg.attachments.maxRetries,
    maxPerFlush: cfg.attachments.maxAttachmentsPerFlush,
    pendingRoot,
  });

  // M2: reminders store + scheduler
  const reminderStore = new ReminderStore(join(dataDir, "reminders.json"));
  await reminderStore.init();

  // F-06: text RateLimitertextmessenger text / agent.create text
  // ReminderQuota textPR etext
  const limiter = new RateLimiter({
    buckets: {
      msg: cfg.rateLimit.message,
      agentCreate: cfg.rateLimit.agentCreate,
    },
  });

  const orchestrator = new AgentOrchestrator({
    messenger,
    runtime,
    registry,
    session,
    // text Telegram text800ms text RPS text
    // M2 polishtexttextBuffer text raw markdown text compose text markdownToHtmltext
    // HTML text** text +1 / < text &lt; text +3 text maxLen text 3500 text 3000
    // text HTML text ~30% text Telegram 4096 text
    streamOptions: { throttleMs: 800, maxLen: 3000 },
    defaultModel: cfg.cursor.defaultModel,
    attachmentDispatcher: dispatcher,
    // F-10text sandboxOptions text orchestrator text runtime text SDK text
    // schema text enabled=truetext config.json text false text
    sandboxOptions: cfg.cursor.sandboxOptions,
    // F-06textagent.create / resume cached miss text
    rateLimiter: limiter,
  });

  const scheduler = new ReminderScheduler({
    store: reminderStore,
    runReminder: (input) => orchestrator.runReminder(input),
    sendText: async (chatId, text) => {
      await messenger.sendText(chatId, text);
    },
  });
  // F-06text/remind add text createdBy text 100/usertext
  const reminderQuota = new ReminderQuota(scheduler, {
    maxPerUser: cfg.rateLimit.reminders.maxPerUser,
  });
  await scheduler.start();

  // text .cursorbot text messenger.start() text
  const activeWs = registry.getActive();
  if (activeWs) await writeClawMarker(activeWs.path);
  // F-07text/ws add text cwd text workspace text config.workspaces.allowedRoots text
  const workspaceAllowedRoots =
    cfg.workspaces.allowedRoots.length > 0
      ? cfg.workspaces.allowedRoots
      : [process.cwd(), ...registry.list().map((w) => w.path)];

  messenger.on("text", (msg) => {
    // text tracetext
    logger.info(
      { userId: msg.userId, username: msg.username, len: msg.text.length },
      "incoming text",
    );
    if (!access.isAllowed(msg.userId)) {
      logger.warn({ userId: msg.userId }, "userId text allowedUserIdstext");
      return;
    }
    // F-06text messenger textdeny text guard text
    void (async () => {
      const ok = await rateLimitGuard({
        limiter,
        messenger,
        chatId: msg.chatId,
        userId: msg.userId,
        key: "msg",
      });
      if (!ok) return;
      await handleText(msg.chatId, msg.text, msg.userId);
    })();
  });

  // M2text image text listener text
  // text agent text imageGroup text
  messenger.on("image", () => {});

  messenger.on("imageGroup", (msg) => {
    if (!access.isAllowed(msg.userId)) {
      logger.warn({ userId: msg.userId }, "userId text allowedUserIdstext");
      return;
    }
    logger.info(
      { userId: msg.userId, n: msg.images.length, hasCaption: !!msg.caption },
      "incoming imageGroup",
    );
    // F-06text "msg" buckettext quotatext
    // text user text capacity 4 / 2 msg-per-sec text
    void (async () => {
      const ok = await rateLimitGuard({
        limiter,
        messenger,
        chatId: msg.chatId,
        userId: msg.userId,
        key: "msg",
      });
      if (!ok) return;
      await handleImageGroup(msg.chatId, msg.images, msg.caption, msg.userId);
    })();
  });

  await messenger.start();
  logger.info("cursorbot started");

  // SIGINT/SIGTERM text long-pollingtext dispose scheduler / orchestrator
  const shutdown = async (): Promise<void> => {
    logger.info("shutting down...");
    try {
      await messenger.stop();
    } catch (e) {
      logger.error({ err: (e as Error).message }, "messenger stop");
    }
    try {
      // M2: scheduler text disposetext timer text orchestrator text disposed
      scheduler.dispose();
    } catch (e) {
      logger.error({ err: (e as Error).message }, "scheduler dispose");
    }
    try {
      await orchestrator.dispose();
    } catch (e) {
      logger.error({ err: (e as Error).message }, "orch dispose");
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  // M2text imageGroup text orchestrator.runPromptWithImages
  // - text cfg.images.maxImagesPerPrompt text
  // - caption text single/multi text prompt
  // - text handleText text ! text force=true
  async function handleImageGroup(
    chatId: string,
    images: Array<{ data: string; mimeType: string }>,
    caption: string | undefined,
    userId: number,
  ): Promise<void> {
    try {
      const cap = cfg.images.maxImagesPerPrompt;
      let used = images;
      if (images.length > cap) {
        used = images.slice(0, cap);
        await messenger.sendText(
          chatId,
          `text ${cap} text ${cap} text`,
        );
      }
      const text =
        caption ??
        (used.length > 1
          ? cfg.images.defaultPromptMulti
          : cfg.images.defaultPromptSingle);
      const { force, text: clean } = parseForcePrefix(text);
      await orchestrator.runPromptWithImages({
        chatId,
        text: clean,
        images: used,
        force,
        userId,
      });
    } catch (e) {
      logger.error({ err: (e as Error).message }, "handleImageGroup text");
      try {
        // F-01 text echo text sanitizetext token / API key text error.message text Telegramtext
        // text downloadFile text
        const safeMsg = sanitizeForOutput((e as Error).message);
        await messenger.sendText(
          chatId,
          `text${safeMsg}`.slice(0, 800),
          { parseMode: "plain" },
        );
      } catch {
        /* ignore */
      }
    }
  }

  async function handleText(
    chatId: string,
    text: string,
    userId: number,
  ): Promise<void> {
    // text try/catchtextTelegram 400/429 text
    try {
      const parsed = parseCommand(text);
      if (parsed.type === "command") {
        await dispatchCommand(parsed, {
          chatId,
          userId,
          messenger,
          registry,
          session,
          orchestrator,
          scheduler,
          reminderQuota,
          workspaceAllowedRoots,
          reminderConfig: {
            tz: cfg.reminders.timezone,
            maxAheadDays: cfg.reminders.maxAheadDays,
          },
        });
        return;
      }
      // text prompt text ! force text
      const { force, text: clean } = parseForcePrefix(parsed.text);
      await orchestrator.runPrompt({ chatId, text: clean, force, userId });
    } catch (e) {
      logger.error({ err: (e as Error).message }, "handleText text");
      try {
        // F-01 textsanitize text echotext handleImageGroup text
        const safeMsg = sanitizeForOutput((e as Error).message);
        // text plain text HTML text
        await messenger.sendText(
          chatId,
          `text${safeMsg}`.slice(0, 800),
          { parseMode: "plain" },
        );
      } catch {
        /* text */
      }
    }
  }
}

main().catch((e) => {
  logger.error({ err: (e as Error).message }, "fatal");
  process.exit(1);
});
