import { logger } from "../../logger.js";
import type { IMessenger } from "../messenger/IMessenger.js";
import type { WorkspaceRegistry } from "../workspace/WorkspaceRegistry.js";
import type { SessionStore } from "../session/SessionStore.js";
import { StreamRenderer, type StreamRendererOptions } from "./streamRenderer.js";
import { summarizeTool } from "./toolSummary.js";
import { decideBusyAction, type RunStatus } from "./busyPolicy.js";
import type { IAgentRuntime, RuntimeAgent, RuntimeRun } from "./runtime.js";
import type { AttachmentDispatcher } from "../attachments/AttachmentDispatcher.js";
import type { RateLimiter } from "../rateLimit/RateLimiter.js";
import { RateLimitedError } from "../rateLimit/errors.js";
import { rateLimitedAgentCreateText } from "../../util/rateLimitMessages.js";
import { wrapUserPrompt } from "./promptEnvelope.js";

// HTML text < > & text HTML parse_mode text
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface OrchestratorDeps {
  messenger: IMessenger;
  runtime: IAgentRuntime;
  registry: WorkspaceRegistry;
  session: SessionStore;
  streamOptions: StreamRendererOptions;
  defaultModel: { id: string; params: Array<{ id: string; value: string }> };
  // M2: text runInternal text cwd text attach text
  // text orchestrator text dispatcher text
  attachmentDispatcher?: AttachmentDispatcher;
  // F-10text cfg.cursor.sandboxOptions text runtime.create / runtime.resumetext
  // schema text orchestrator text cursorSdkRuntime text
  // text"text"text create + resume text
  sandboxOptions?: { enabled: boolean };
  // F-06textcached miss text Agent.create / resume text
  rateLimiter?: RateLimiter;
}

interface PoolEntry {
  agent: RuntimeAgent;
  activeRun?: RuntimeRun;
}

/**
 * cursorbot text"text"text + SDK runtime text
 *
 * text
 * - text workspace name text SDKAgent text workspace text agenttext
 * - text prompt text run / reject / force-replace
 * - text SDK text IMessenger text
 * - text cancel / reset / dispose text
 */
export class AgentOrchestrator {
  private readonly pool = new Map<string, PoolEntry>();

  constructor(private readonly deps: OrchestratorDeps) {}

  async runPrompt(input: {
    chatId: string;
    text: string;
    force: boolean;
    userId: number;
  }): Promise<void> {
    await this.runInternal(input);
  }

  // M2text runPrompt text SDK.send text images text
  async runPromptWithImages(input: {
    chatId: string;
    text: string;
    force: boolean;
    images: Array<{ data: string; mimeType: string }>;
    userId: number;
  }): Promise<void> {
    await this.runInternal(input);
  }

  /**
   * M2text remindertext
   * - kind='text' text text sendTexttext busy
   * - kind='prompt' text text runInternaltextforce text falsetext busy text scheduler
   *
   * scheduler text busy=true text +60stext busy text
   * sendText text delivered/busy text scheduler text
   *
   * textkind='prompt' text workspaceId text active workspacetext
   * text cross-workspace reminder text M3+text
   */
  async runReminder(input: {
    chatId: string;
    kind: "text" | "prompt";
    text?: string;
    prompt?: string;
    workspaceId?: string;
    userId: number;
  }): Promise<{ delivered: boolean; busy?: boolean }> {
    if (input.kind === "text") {
      const text = input.text ?? "";
      await this.deps.messenger.sendText(input.chatId, `text ${text}`);
      return { delivered: true };
    }
    // prompt textforce text falsetext skipBusyMsg text"agent text"text
    // text scheduler text vs text
    const ok = await this.runInternal({
      chatId: input.chatId,
      text: input.prompt ?? "",
      force: false,
      skipBusyMsg: true,
      userId: input.userId,
    });
    return { delivered: ok, busy: !ok };
  }

  // texttext-only / images / reminder text
  // text
  // 1. text ensureAgent / busyPolicy / streamRenderer text
  // 2. text images text send text
  // texttrue=text send / text streamtextfalse=text ws / busy rejecttext
  private async runInternal(input: {
    chatId: string;
    text: string;
    force: boolean;
    images?: Array<{ data: string; mimeType: string }>;
    // M2textreminder text prompt text busy text
    skipBusyMsg?: boolean;
    userId: number;
  }): Promise<boolean> {
    const ws = this.deps.registry.getActive();
    if (!ws) {
      await this.deps.messenger.sendText(
        input.chatId,
        "text /ws add text",
      );
      return false;
    }
    const wsId = ws.name;

    let entry: PoolEntry;
    try {
      entry = await this.ensureAgent(wsId, ws.path, input.userId);
    } catch (e) {
      if (e instanceof RateLimitedError) {
        logger.warn(
          { userId: input.userId, key: e.key, retryMs: e.retryAfterMs },
          "rate limited",
        );
        await this.deps.messenger.sendText(
          input.chatId,
          rateLimitedAgentCreateText(e.retryAfterMs),
          { parseMode: "plain" },
        );
        return false;
      }
      throw e;
    }
    const action = decideBusyAction({
      activeRunStatus: entry.activeRun?.status as RunStatus | undefined,
      force: input.force,
    });

    if (action === "reject") {
      if (!input.skipBusyMsg) {
        await this.deps.messenger.sendText(
          input.chatId,
          `Agent text <b>${ws.name}</b> text /cancel text ! text`,
          { parseMode: "HTML" },
        );
      }
      return false;
    }

    const renderer = new StreamRenderer(
      this.deps.messenger,
      input.chatId,
      this.deps.streamOptions,
    );
    await renderer.start("text thinking...");

    let run: RuntimeRun;
    try {
      run = await entry.agent.send(wrapUserPrompt(input.text), {
        force: action === "force-replace",
        images: input.images,
      });
    } catch (e) {
      const msg = (e as Error).message;
      logger.error({ err: msg }, "agent.send failed");
      // text < > text Telegram HTMLtext escape text
      await renderer.finalize(`\ntext Error: ${escapeHtml(msg.slice(0, 400))}`);
      // text"text"textagent text true text scheduler text
      return true;
    }
    entry.activeRun = run;

    try {
      for await (const event of run.stream()) {
        switch (event.type) {
          case "assistant":
            // M2 polishtextStreamRenderer text raw markdown + compose text
            // text SDK text ** / ` / [ ] text chunk text regex text
            await renderer.pushText(event.text);
            break;
          case "thinking":
            renderer.setStatus("text thinking...");
            break;
          case "tool_call":
            if (event.status === "running") {
              renderer.setStatus(`text ${summarizeTool(event.name, event.args)}`);
            } else if (event.status === "completed") {
              renderer.setStatus("text thinking...");
            } else {
              renderer.setStatus(`text ${event.name} failed`);
            }
            break;
        }
      }
      const r = await run.wait();
      if (r.status === "cancelled") {
        await renderer.finalize("\n<i>(text)</i>");
      } else if (r.status === "error") {
        // SDK text result textserver text + Telegram text N text
        logger.error(
          { err: r.result, durationMs: r.durationMs },
          "run finished with error",
        );
        const tail = r.result
          ? `\ntext Error: ${escapeHtml(r.result.slice(0, 400))}`
          : "\ntext Error";
        await renderer.finalize(tail);
      } else {
        await renderer.finalize();
      }
    } finally {
      if (entry.activeRun === run) entry.activeRun = undefined;
    }

    // M2: run text finished / cancelled / errortext
    // text workspace text chatIdtextattach CLI text agent text run text
    // textdispatcher text/text/text
    if (this.deps.attachmentDispatcher) {
      try {
        await this.deps.attachmentDispatcher.flushForCwd(ws.path, input.chatId);
      } catch (e) {
        logger.error(
          { err: (e as Error).message },
          "dispatcher.flushForCwd text",
        );
      }
    }

    return true;
  }

  async cancel(workspaceId: string): Promise<void> {
    const entry = this.pool.get(workspaceId);
    if (entry?.activeRun) await entry.activeRun.cancel();
  }

  // /reset text agent text + text sessionStore text agentId
  async resetWorkspace(workspaceId: string): Promise<void> {
    const entry = this.pool.get(workspaceId);
    if (entry) {
      await entry.agent.dispose();
      this.pool.delete(workspaceId);
    }
    await this.deps.session.clear(workspaceId);
  }

  // text active runtext SDKAgent
  async dispose(): Promise<void> {
    for (const e of this.pool.values()) {
      try {
        await e.activeRun?.cancel();
      } catch {
        /* ignore */
      }
      try {
        await e.agent.dispose();
      } catch {
        /* ignore */
      }
    }
    this.pool.clear();
  }

  // text agenttext SessionStore text agentId text resumetext create
  private async ensureAgent(
    workspaceId: string,
    cwd: string,
    userId: number,
  ): Promise<PoolEntry> {
    const cached = this.pool.get(workspaceId);
    if (cached) return cached;

    // F-06text cached miss text agentCreate tokentext agent text
    if (this.deps.rateLimiter) {
      const r = this.deps.rateLimiter.check(userId, "agentCreate");
      if (!r.allowed) {
        throw new RateLimitedError("agentCreate", r.retryAfterMs);
      }
    }

    const sess = this.deps.session.get(workspaceId);
    let agent: RuntimeAgent;
    if (sess?.agentId) {
      // text@cursor/sdk 1.0.x text Agent.resume text modeltext
      // text agent text modeltext sess.model + sess.modelParams text
      // text /model text"text"textfallback text defaultModel text sesstextM1 text modeltext
      const resumedModel = sess.model
        ? { id: sess.model, params: sess.modelParams ?? [] }
        : this.deps.defaultModel;
      agent = await this.deps.runtime.resume(sess.agentId, {
        cwd,
        model: resumedModel,
        sandboxOptions: this.deps.sandboxOptions,
      });
    } else {
      agent = await this.deps.runtime.create({
        cwd,
        model: this.deps.defaultModel,
        sandboxOptions: this.deps.sandboxOptions,
      });
      await this.deps.session.set(workspaceId, {
        agentId: agent.agentId,
        model: this.deps.defaultModel.id,
        modelParams: this.deps.defaultModel.params,
      });
    }
    const entry: PoolEntry = { agent };
    this.pool.set(workspaceId, entry);
    return entry;
  }
}
