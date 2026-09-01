import { AcpProcess } from "../../adapters/acp/AcpProcess.js";
import { AcpSession, type AcpRunHandle } from "../../adapters/acp/AcpSession.js";
import type {
  AskQuestionParams,
  CreatePlanParams,
  PermissionRequestParams,
} from "../../adapters/acp/acpTypes.js";
import { logger } from "../../logger.js";
import type {
  CreateAgentOptions,
  IAgentRuntime,
  ResumeAgentOptions,
  RuntimeAgent,
  RuntimeInteractionResponse,
  RuntimeRun,
  RuntimeStreamEvent,
} from "./runtime.js";

export interface AcpRuntimeOptions {
  agentCliPath: string;
  apiKey?: string;
  mode: "agent" | "plan" | "ask";
}

export class AcpRuntime implements IAgentRuntime {
  constructor(private readonly opts: AcpRuntimeOptions) {}

  async create(opts: CreateAgentOptions): Promise<RuntimeAgent> {
    const proc = new AcpProcess({
      agentCliPath: this.opts.agentCliPath,
      apiKey: this.opts.apiKey,
      cwd: opts.cwd,
    });
    await proc.start();
    const session = await AcpSession.connect(
      proc,
      {
        agentCliPath: this.opts.agentCliPath,
        apiKey: this.opts.apiKey,
        mode: opts.mode,
        cwd: opts.cwd,
      },
    );
    logger.info({ sessionId: session.sessionId, cwd: opts.cwd }, "ACP session created");
    return new AcpAgentWrapper(session, proc);
  }

  async resume(sessionId: string, opts: ResumeAgentOptions): Promise<RuntimeAgent> {
    const proc = new AcpProcess({
      agentCliPath: this.opts.agentCliPath,
      apiKey: this.opts.apiKey,
      cwd: opts.cwd,
    });
    await proc.start();
    const session = await AcpSession.connect(
      proc,
      {
        agentCliPath: this.opts.agentCliPath,
        apiKey: this.opts.apiKey,
        mode: opts.mode,
        cwd: opts.cwd,
      },
      sessionId,
    );
    logger.info({ sessionId: session.sessionId, cwd: opts.cwd }, "ACP session resumed");
    return new AcpAgentWrapper(session, proc);
  }
}

class AcpAgentWrapper implements RuntimeAgent {
  sessionId: string;

  constructor(
    private readonly session: AcpSession,
    private readonly proc: AcpProcess,
  ) {
    this.sessionId = session.sessionId;
  }

  async send(
    text: string,
    opts?: {
      force?: boolean;
      images?: Array<{ data: string; mimeType: string }>;
    },
  ): Promise<RuntimeRun> {
    if (opts?.force && this.session.running) {
      await this.session.cancelActive();
    }
    const handle = await this.session.prompt(text, opts?.images);
    return new AcpRunWrapper(handle);
  }

  async setMode(modeId: "agent" | "plan" | "ask"): Promise<void> {
    await this.session.setMode(modeId);
  }

  getMode(): string | undefined {
    return this.session.getMode();
  }

  getAvailableModes() {
    return this.session.getAvailableModes();
  }

  async dispose(): Promise<void> {
    await this.session.dispose();
    await this.proc.close();
  }
}

class AcpRunWrapper implements RuntimeRun {
  status: "running" | "finished" | "error" | "cancelled" = "running";

  constructor(private readonly handle: AcpRunHandle) {
    this.status = handle.status;
  }

  async *stream(): AsyncGenerator<RuntimeStreamEvent, void> {
    for await (const raw of this.handle.events()) {
      this.status = this.handle.status;
      const event = mapAcpEvent(raw);
      if (event) yield event;
    }
    this.status = this.handle.status;
  }

  async wait(): Promise<{
    status: "finished" | "error" | "cancelled";
    result?: string;
    durationMs?: number;
  }> {
    while (this.handle.status === "running") {
      await new Promise((r) => setTimeout(r, 50));
    }
    this.status = this.handle.status;
    const finalStatus = this.handle.status;
    return {
      status:
        finalStatus === "error" || finalStatus === "cancelled"
          ? finalStatus
          : "finished",
      result: this.handle.result,
      durationMs: this.handle.durationMs,
    };
  }

  async cancel(): Promise<void> {
    this.handle.cancel();
    this.status = "cancelled";
  }

  async respond(
    interactionId: string,
    response: RuntimeInteractionResponse,
  ): Promise<void> {
    const payload = buildAcpResponse(response);
    this.handle.resolveInteraction(interactionId, payload);
  }
}

function mapAcpEvent(raw: unknown): RuntimeStreamEvent | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const e = raw as Record<string, unknown>;

  if (e.kind === "assistant" && typeof e.text === "string") {
    return { type: "assistant", text: e.text };
  }

  if (e.kind === "permission_request") {
    const params = (e.params ?? {}) as PermissionRequestParams;
    return {
      type: "permission_request",
      interactionId: e.interactionId as string,
      tool: typeof params.tool === "string" ? params.tool : undefined,
      args: params.args,
      summary: typeof params.summary === "string" ? params.summary : undefined,
    };
  }

  if (e.kind === "question_request") {
    const params = e.params as AskQuestionParams;
    return {
      type: "question_request",
      interactionId: e.interactionId as string,
      title: params.title,
      questions: params.questions,
    };
  }

  if (e.kind === "plan_request") {
    const params = e.params as CreatePlanParams;
    return {
      type: "plan_request",
      interactionId: e.interactionId as string,
      name: params.name,
      overview: params.overview,
      plan: params.plan,
      todos: params.todos,
    };
  }

  if (e.kind === "notification") {
    const subtype = e.subtype as "todos" | "task";
    return {
      type: "notification",
      subtype,
      params: e.params,
    };
  }

  return undefined;
}

function buildAcpResponse(response: RuntimeInteractionResponse): unknown {
  switch (response.kind) {
    case "permission":
      return {
        outcome: { outcome: "selected", optionId: response.optionId },
      };
    case "question":
      return {
        outcome: { outcome: "answered", answers: response.answers },
      };
    case "plan":
      return response.accepted
        ? { outcome: { outcome: "accepted" } }
        : { outcome: { outcome: "cancelled" } };
  }
}
