import { JsonRpcClient, type LineTransport } from "./JsonRpcClient.js";
import type {
  AcpMode,
  AcpModeInfo,
  AcpSessionConfig,
  AcpSessionModes,
  AcpSessionResult,
  AskQuestionParams,
  CreatePlanParams,
  SessionUpdateParams,
} from "./acpTypes.js";
import { logger } from "../../logger.js";

export interface AcpPromptResult {
  stopReason?: string;
  [key: string]: unknown;
}

type InteractionWaiter = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
};

/** One ACP prompt execution with streaming events and blocking interactions. */
export class AcpRunHandle {
  status: "running" | "finished" | "error" | "cancelled" = "running";
  result?: string;
  durationMs?: number;
  private readonly startedAt = Date.now();
  private readonly queue: unknown[] = [];
  private queueWaiters: Array<() => void> = [];
  private done = false;
  private interactionSeq = 0;
  private readonly interactionWaiters = new Map<string, InteractionWaiter>();
  /** Maps interactionId -> RPC response payload builder */
  readonly pendingInteractions = new Map<
    string,
    { rpcId: number; kind: string; params: unknown }
  >();

  push(event: unknown): void {
    if (this.done) return;
    this.queue.push(event);
    const w = this.queueWaiters.shift();
    if (w) w();
  }

  registerInteraction(rpcId: number, kind: string, params: unknown): string {
    const interactionId = `i-${++this.interactionSeq}`;
    this.pendingInteractions.set(interactionId, { rpcId, kind, params });
    return interactionId;
  }

  finish(result?: AcpPromptResult): void {
    this.status = "finished";
    this.result = typeof result?.stopReason === "string" ? result.stopReason : undefined;
    this.durationMs = Date.now() - this.startedAt;
    this.done = true;
    this.signalWaiters();
  }

  fail(err: Error): void {
    this.status = "error";
    this.result = err.message;
    this.durationMs = Date.now() - this.startedAt;
    this.done = true;
    this.signalWaiters();
    for (const w of this.interactionWaiters.values()) w.reject(err);
    this.interactionWaiters.clear();
  }

  cancel(): void {
    this.status = "cancelled";
    this.durationMs = Date.now() - this.startedAt;
    this.done = true;
    this.signalWaiters();
    for (const w of this.interactionWaiters.values()) {
      w.reject(new Error("cancelled"));
    }
    this.interactionWaiters.clear();
  }

  waitForInteraction(interactionId: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.interactionWaiters.set(interactionId, { resolve, reject });
    });
  }

  resolveInteraction(interactionId: string, value: unknown): void {
    const w = this.interactionWaiters.get(interactionId);
    if (w) {
      this.interactionWaiters.delete(interactionId);
      w.resolve(value);
    }
    this.pendingInteractions.delete(interactionId);
  }

  async *events(): AsyncGenerator<unknown, void> {
    while (!this.done || this.queue.length > 0) {
      if (this.queue.length === 0) {
        await new Promise<void>((resolve) => this.queueWaiters.push(resolve));
        continue;
      }
      yield this.queue.shift();
    }
  }

  private signalWaiters(): void {
    while (this.queueWaiters.length) {
      const w = this.queueWaiters.shift();
      w?.();
    }
  }
}

export class AcpSession {
  readonly sessionId: string;
  private readonly rpc: JsonRpcClient;
  private activeRun?: AcpRunHandle;
  private promptPromise?: Promise<void>;
  private currentModeId?: string;
  private availableModes: AcpModeInfo[] = [];

  private constructor(sessionId: string, rpc: JsonRpcClient) {
    this.sessionId = sessionId;
    this.rpc = rpc;
    this.wireHandlers();
  }

  static async connect(
    transport: LineTransport,
    cfg: AcpSessionConfig,
    existingSessionId?: string,
  ): Promise<AcpSession> {
    const rpc = new JsonRpcClient(transport);
    await rpc.request("initialize", {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
      clientInfo: { name: "cursorbot", version: "0.2.0" },
    });
    await rpc.request("authenticate", { methodId: "cursor_login" });

    let sessionId = existingSessionId;
    let modes: AcpSessionModes | undefined;
    if (sessionId) {
      const loaded = (await rpc.request("session/load", {
        sessionId,
        cwd: cfg.cwd,
      })) as AcpSessionResult;
      modes = loaded.modes;
    } else {
      const params: Record<string, unknown> = { cwd: cfg.cwd, mcpServers: [] };
      if (cfg.mode) params.mode = cfg.mode;
      const created = (await rpc.request("session/new", params)) as AcpSessionResult;
      sessionId = created.sessionId;
      modes = created.modes;
    }
    if (!sessionId) throw new Error("ACP session id missing");

    const session = new AcpSession(sessionId, rpc);
    session.applyModes(modes);
    if (cfg.mode && cfg.mode !== session.currentModeId) {
      await session.setMode(cfg.mode);
    }
    return session;
  }

  getMode(): string | undefined {
    return this.currentModeId;
  }

  getAvailableModes(): AcpModeInfo[] {
    return [...this.availableModes];
  }

  async setMode(modeId: AcpMode | string): Promise<void> {
    await this.rpc.request("session/set_mode", {
      sessionId: this.sessionId,
      modeId,
    });
    this.currentModeId = modeId;
    logger.info({ sessionId: this.sessionId, modeId }, "ACP mode set");
  }

  get running(): boolean {
    return this.activeRun?.status === "running";
  }

  async prompt(
    text: string,
    images?: Array<{ data: string; mimeType: string }>,
  ): Promise<AcpRunHandle> {
    if (this.activeRun?.status === "running") {
      throw new Error("ACP session busy");
    }
    const run = new AcpRunHandle();
    this.activeRun = run;

    const promptParts: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [
      { type: "text", text },
    ];
    if (images?.length) {
      for (const img of images) {
        promptParts.push({ type: "image", data: img.data, mimeType: img.mimeType });
      }
    }

    this.promptPromise = (async () => {
      try {
        const result = (await this.rpc.request("session/prompt", {
          sessionId: this.sessionId,
          prompt: promptParts,
        })) as AcpPromptResult;
        run.finish(result);
      } catch (e) {
        run.fail(e as Error);
      } finally {
        if (this.activeRun === run) this.activeRun = undefined;
      }
    })();

    return run;
  }

  async cancelActive(): Promise<void> {
    if (this.activeRun) {
      this.activeRun.cancel();
      try {
        await this.rpc.request("session/cancel", { sessionId: this.sessionId });
      } catch {
        /* ignore */
      }
      await this.promptPromise?.catch(() => undefined);
      this.activeRun = undefined;
    }
  }

  async dispose(): Promise<void> {
    await this.cancelActive();
    await this.rpc.close();
  }

  get client(): JsonRpcClient {
    return this.rpc;
  }

  private applyModes(modes?: AcpSessionModes): void {
    if (!modes) return;
    this.currentModeId = modes.currentModeId;
    this.availableModes = modes.availableModes ?? [];
  }

  private wireHandlers(): void {
    this.rpc.onNotification("session/update", (params) => {
      const p = params as SessionUpdateParams;
      const update = p.update;
      if (update?.sessionUpdate === "current_mode_update" && typeof update.modeId === "string") {
        this.currentModeId = update.modeId;
        logger.info({ sessionId: this.sessionId, modeId: update.modeId }, "ACP mode updated");
      }

      const run = this.activeRun;
      if (!run || run.status !== "running") return;
      if (update?.sessionUpdate === "agent_message_chunk" && update.content?.text) {
        run.push({ kind: "assistant", text: update.content.text });
      }
    });

    this.rpc.onRequest("session/request_permission", async (params, rpcId) => {
      const run = this.activeRun;
      if (!run) return { outcome: { outcome: "selected", optionId: "reject-once" } };
      const interactionId = run.registerInteraction(rpcId, "permission", params);
      run.push({
        kind: "permission_request",
        interactionId,
        params,
      });
      return run.waitForInteraction(interactionId);
    });

    this.rpc.onRequest("cursor/ask_question", async (params, rpcId) => {
      const run = this.activeRun;
      if (!run) return { outcome: { outcome: "cancelled" } };
      const interactionId = run.registerInteraction(rpcId, "question", params);
      run.push({
        kind: "question_request",
        interactionId,
        params: params as AskQuestionParams,
      });
      return run.waitForInteraction(interactionId);
    });

    this.rpc.onRequest("cursor/create_plan", async (params, rpcId) => {
      const run = this.activeRun;
      if (!run) return { outcome: { outcome: "cancelled" } };
      const interactionId = run.registerInteraction(rpcId, "plan", params);
      run.push({
        kind: "plan_request",
        interactionId,
        params: params as CreatePlanParams,
      });
      return run.waitForInteraction(interactionId);
    });

    this.rpc.onNotification("cursor/update_todos", (params) => {
      this.activeRun?.push({ kind: "notification", subtype: "todos", params });
    });

    this.rpc.onNotification("cursor/task", (params) => {
      this.activeRun?.push({ kind: "notification", subtype: "task", params });
    });
  }
}
