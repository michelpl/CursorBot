import { join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { loadConfig } from "../config/loadConfig.js";
import { logger } from "../logger.js";
import { TelegramMessenger } from "../adapters/telegram/TelegramMessenger.js";
import { WorkspaceRegistry } from "../core/workspace/WorkspaceRegistry.js";
import { SessionStore } from "../core/session/SessionStore.js";
import { AccessControl } from "../core/access/AccessControl.js";
import { AgentOrchestrator } from "../core/orchestrator/AgentOrchestrator.js";
import { AcpRuntime } from "../core/orchestrator/acpRuntime.js";
import { AttachmentQueue } from "../core/attachments/AttachmentQueue.js";
import { AttachmentDispatcher } from "../core/attachments/AttachmentDispatcher.js";
import { ReminderStore } from "../core/reminders/ReminderStore.js";
import { ReminderQuota } from "../core/reminders/ReminderQuota.js";
import { ReminderScheduler } from "../core/reminders/ReminderScheduler.js";
import { PendingInteractionStore } from "../core/interactions/PendingInteractionStore.js";
import { InteractionRouter } from "../core/interactions/InteractionRouter.js";
import { parseCommand } from "../commands/parser.js";
import { parseModeCommand, modeCommandHelp } from "../commands/modeCommands.js";
import {
  buildExecutionPrompt,
  shouldInjectApprovedPlan,
} from "../core/orchestrator/planPrompt.js";
import {
  ApprovedPlanStore,
  approvedPlanStorePath,
} from "../core/plans/ApprovedPlanStore.js";
import { dispatchCommand } from "../commands/dispatch.js";
import { parseForcePrefix } from "../core/orchestrator/busyPolicy.js";
import { sanitizeForOutput } from "../util/sanitize.js";
import { RateLimiter } from "../core/rateLimit/RateLimiter.js";
import { rateLimitGuard } from "./wiring/rateLimitGuard.js";

async function main(): Promise<void> {
  const cfg = await loadConfig({});
  if (
    cfg.cursor.apiKey.startsWith("REPLACE_") ||
    cfg.cursor.apiKey === "key_..."
  ) {
    throw new Error(
      "cursor.apiKey não configurada. Defina CURSOR_API_KEY no ambiente ou edite config.json.",
    );
  }
  if (/^\d+:[A-Za-z0-9_-]+$/.test(cfg.cursor.apiKey)) {
    logger.warn(
      "cursor.apiKey parece ser o token do Telegram, não uma chave Cursor (key_…). " +
        "Obtenha em Cursor Settings ou use `agent login`.",
    );
  }
  const dataDir = cfg.paths.dataDir;
  await mkdir(dataDir, { recursive: true, mode: 0o700 });

  const registry = new WorkspaceRegistry(join(dataDir, "workspaces.json"));
  await registry.init({
    autoRegisterCwd: cfg.workspaces.autoRegisterCwd,
    cwd: process.cwd(),
  });

  const session = new SessionStore(join(dataDir, "sessions.json"));
  await session.init();

  const approvedPlanStore = new ApprovedPlanStore(approvedPlanStorePath(dataDir));
  await approvedPlanStore.init();

  const writeClawMarker = async (wsPath: string): Promise<void> => {
    try {
      const markerDir = join(wsPath, ".cursorbot");
      await mkdir(markerDir, { recursive: true, mode: 0o700 });
      const abs = resolve(dataDir);
      await writeFile(join(markerDir, "data-dir.txt"), abs, {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch (e) {
      logger.warn(
        { err: (e as Error).message, wsPath },
        "failed to write data-dir marker",
      );
    }
  };

  const access = new AccessControl(cfg.telegram.allowedUserIds);
  const messenger = new TelegramMessenger({
    botToken: cfg.telegram.botToken,
    parseMode: cfg.telegram.parseMode,
    allowedUserIds: cfg.telegram.allowedUserIds,
    mediaGroupDebounceMs: cfg.images.mediaGroupDebounceMs,
    maxFileSizeBytes: cfg.attachments.maxFileSizeBytes,
  });

  const runtime = new AcpRuntime({
    agentCliPath: cfg.cursor.agentCliPath,
    apiKey: cfg.cursor.apiKey,
    mode: cfg.cursor.acpMode,
  });

  const queue = new AttachmentQueue(join(dataDir, "attachments", "queue.jsonl"));
  const pendingRoot = join(dataDir, "attachments", "pending");
  const dispatcher = new AttachmentDispatcher({
    queue,
    messenger,
    maxRetries: cfg.attachments.maxRetries,
    maxPerFlush: cfg.attachments.maxAttachmentsPerFlush,
    pendingRoot,
  });

  const reminderStore = new ReminderStore(join(dataDir, "reminders.json"));
  await reminderStore.init();

  const limiter = new RateLimiter({
    buckets: {
      msg: cfg.rateLimit.message,
      sessionCreate: cfg.rateLimit.sessionCreate,
    },
  });

  const interactionStore = new PendingInteractionStore({
    dataDir,
    timeoutMs: cfg.cursor.interactionTimeoutMs,
  });
  await interactionStore.init();

  const orchestrator = new AgentOrchestrator({
    messenger,
    runtime,
    registry,
    session,
    streamOptions: { throttleMs: 800, maxLen: 3000 },
    acpMode: cfg.cursor.acpMode,
    attachmentDispatcher: dispatcher,
    rateLimiter: limiter,
    interactionStore,
    approvedPlanStore,
  });

  interactionStore.setOnTimeout(async (item) => {
    logger.warn({ interactionId: item.interactionId }, "interaction timed out");
    try {
      await orchestrator.respondToInteraction(
        item.chatId,
        item.interactionId,
        interactionStore.defaultTimeoutResponse(item.kind),
      );
      await messenger.sendText(
        item.chatId,
        "⏱ Interação expirada — resposta automática aplicada.",
      );
    } catch (e) {
      logger.error({ err: (e as Error).message }, "interaction timeout handler failed");
    }
  });

  const interactionRouter = new InteractionRouter(interactionStore);

  const scheduler = new ReminderScheduler({
    store: reminderStore,
    runReminder: (input) => orchestrator.runReminder(input),
    sendText: async (chatId, text) => {
      await messenger.sendText(chatId, text);
    },
  });
  const reminderQuota = new ReminderQuota(scheduler, {
    maxPerUser: cfg.rateLimit.reminders.maxPerUser,
  });
  await scheduler.start();

  const activeWs = registry.getActive();
  if (activeWs) await writeClawMarker(activeWs.path);
  const workspaceAllowedRoots =
    cfg.workspaces.allowedRoots.length > 0
      ? cfg.workspaces.allowedRoots
      : [process.cwd(), ...registry.list().map((w) => w.path)];

  messenger.on("text", (msg) => {
    logger.info(
      { userId: msg.userId, username: msg.username, len: msg.text.length },
      "incoming text",
    );
    if (!access.isAllowed(msg.userId)) {
      logger.warn({ userId: msg.userId }, "user not in allowedUserIds");
      return;
    }
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

  messenger.on("image", () => {});

  messenger.on("imageGroup", (msg) => {
    if (!access.isAllowed(msg.userId)) {
      logger.warn({ userId: msg.userId }, "user not in allowedUserIds");
      return;
    }
    logger.info(
      { userId: msg.userId, n: msg.images.length, hasCaption: !!msg.caption },
      "incoming imageGroup",
    );
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

  messenger.on("callback_query", (msg) => {
    if (!access.isAllowed(msg.userId)) return;
    void (async () => {
      const routed = interactionRouter.routeCallback(msg.chatId, msg.data);
      if (!routed || routed.action !== "respond") {
        await messenger.answerCallbackQuery(msg.callbackQueryId);
        return;
      }
      const ok = await orchestrator.respondToInteraction(
        msg.chatId,
        routed.interactionId,
        routed.response,
      );
      await messenger.answerCallbackQuery(
        msg.callbackQueryId,
        ok ? "Registrado" : "Interação inválida",
      );
    })();
  });

  await messenger.start();
  logger.info("cursorbot started (ACP mode)");

  const shutdown = async (): Promise<void> => {
    logger.info("shutting down...");
    try {
      await messenger.stop();
    } catch (e) {
      logger.error({ err: (e as Error).message }, "messenger stop");
    }
    try {
      scheduler.dispose();
    } catch (e) {
      logger.error({ err: (e as Error).message }, "scheduler dispose");
    }
    try {
      interactionStore.dispose();
    } catch (e) {
      logger.error({ err: (e as Error).message }, "interaction store dispose");
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
          `Limite de ${cap} imagens por prompt — usando as primeiras ${cap}.`,
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
      logger.error({ err: (e as Error).message }, "handleImageGroup failed");
      try {
        const safeMsg = sanitizeForOutput((e as Error).message);
        await messenger.sendText(chatId, `Erro: ${safeMsg}`.slice(0, 800), {
          parseMode: "plain",
        });
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
    try {
      const routed = interactionRouter.routeText(chatId, text);
      if (routed.action === "respond") {
        const ok = await orchestrator.respondToInteraction(
          chatId,
          routed.interactionId,
          routed.response,
        );
        if (ok) return;
      }

      const parsed = parseCommand(text);
      if (parsed.type === "command") {
        const modeCmd = parseModeCommand(parsed);
        if (modeCmd) {
          if (modeCmd.kind === "help") {
            await messenger.sendText(chatId, modeCommandHelp(modeCmd.mode), {
              parseMode: "plain",
            });
            return;
          }
          if (modeCmd.kind === "set-only") {
            await orchestrator.setSessionMode({
              chatId,
              mode: modeCmd.mode,
              userId,
            });
            await messenger.sendText(chatId, `Modo ${modeCmd.mode} ativo.`, {
              parseMode: "plain",
            });
            return;
          }
          let promptText = modeCmd.text;
          const ws = registry.getActive();
          if (ws && modeCmd.mode === "agent") {
            const approved = approvedPlanStore.get(ws.name);
            if (approved && shouldInjectApprovedPlan(promptText)) {
              promptText = buildExecutionPrompt(promptText, approved.plan);
            }
          }
          const { force, text: clean } = parseForcePrefix(promptText);
          await orchestrator.runPrompt({
            chatId,
            text: clean,
            force,
            userId,
            mode: modeCmd.mode,
          });
          return;
        }

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
      const { force, text: clean } = parseForcePrefix(parsed.text);
      await orchestrator.runPrompt({ chatId, text: clean, force, userId });
    } catch (e) {
      logger.error({ err: (e as Error).message }, "handleText failed");
      try {
        const safeMsg = sanitizeForOutput((e as Error).message);
        await messenger.sendText(chatId, `Erro: ${safeMsg}`.slice(0, 800), {
          parseMode: "plain",
        });
      } catch {
        /* ignore */
      }
    }
  }
}

main().catch((e) => {
  logger.error({ err: (e as Error).message }, "fatal");
  process.exit(1);
});
