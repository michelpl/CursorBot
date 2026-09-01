import type {
  IAgentRuntime,
  RuntimeAgent,
  RuntimeRun,
  RuntimeStreamEvent,
  RuntimeInteractionResponse,
  CreateAgentOptions,
  ResumeAgentOptions,
} from "../../src/core/orchestrator/runtime.js";

export class StubAgentRuntime implements IAgentRuntime {
  public agents: StubAgent[] = [];
  public created: CreateAgentOptions[] = [];
  public resumed: Array<{ sessionId: string; opts: ResumeAgentOptions }> = [];

  async create(opts: CreateAgentOptions): Promise<RuntimeAgent> {
    const a = new StubAgent(`session-stub-${this.agents.length + 1}`);
    this.agents.push(a);
    this.created.push(opts);
    return a;
  }

  async resume(sessionId: string, opts: ResumeAgentOptions): Promise<RuntimeAgent> {
    this.resumed.push({ sessionId, opts });
    const a = new StubAgent(sessionId);
    this.agents.push(a);
    return a;
  }
}

export class StubAgent implements RuntimeAgent {
  public sentTexts: string[] = [];
  public lastSend?: {
    text: string;
    force?: boolean;
    images?: Array<{ data: string; mimeType: string }>;
  };
  public currentRun?: StubRun;
  public mode = "agent";
  public modeChanges: string[] = [];
  constructor(public sessionId: string) {}

  async send(
    text: string,
    opts?: {
      force?: boolean;
      images?: Array<{ data: string; mimeType: string }>;
    },
  ): Promise<RuntimeRun> {
    this.sentTexts.push(text);
    this.lastSend = { text, force: opts?.force, images: opts?.images };
    const run = new StubRun(text, opts?.force ?? false);
    this.currentRun = run;
    return run;
  }

  async setMode(modeId: "agent" | "plan" | "ask"): Promise<void> {
    this.mode = modeId;
    this.modeChanges.push(modeId);
  }

  getMode(): string | undefined {
    return this.mode;
  }

  getAvailableModes() {
    return [
      { id: "agent", name: "Agent" },
      { id: "plan", name: "Plan" },
      { id: "ask", name: "Ask" },
    ];
  }

  async dispose(): Promise<void> {}
}

export class StubRun implements RuntimeRun {
  status: "running" | "finished" | "error" | "cancelled" = "running";
  public scripted: RuntimeStreamEvent[] = [];
  private scriptReady = false;
  private interactionSeq = 0;
  private readonly interactionResolvers = new Map<
    string,
    (r: RuntimeInteractionResponse) => void
  >();

  constructor(
    public text: string,
    public force: boolean,
  ) {}

  setScript(events: RuntimeStreamEvent[]): void {
    this.scripted = events;
    this.scriptReady = true;
  }

  async *stream(): AsyncGenerator<RuntimeStreamEvent, void> {
    let waited = 0;
    while (!this.scriptReady && this.status === "running" && waited < 200) {
      await new Promise((r) => setTimeout(r, 5));
      waited++;
    }
    for (const e of this.scripted) {
      if (this.status === "cancelled") break;
      yield e;
      await new Promise((r) => setTimeout(r, 12));
    }
    this.status = this.status === "cancelled" ? "cancelled" : "finished";
  }

  async wait(): Promise<{
    status: "finished" | "error" | "cancelled";
    result?: string;
  }> {
    return { status: this.status === "running" ? "finished" : this.status };
  }

  async cancel(): Promise<void> {
    this.status = "cancelled";
  }

  async respond(
    interactionId: string,
    response: RuntimeInteractionResponse,
  ): Promise<void> {
    const resolver = this.interactionResolvers.get(interactionId);
    if (resolver) {
      this.interactionResolvers.delete(interactionId);
      resolver(response);
    }
  }

  /** Test helper: register a permission interaction that blocks until respond(). */
  async emitPermissionAndWait(
    tool: string,
  ): Promise<{ interactionId: string; response: RuntimeInteractionResponse }> {
    const interactionId = `i-${++this.interactionSeq}`;
    const responsePromise = new Promise<RuntimeInteractionResponse>((resolve) => {
      this.interactionResolvers.set(interactionId, resolve);
    });
    this.scripted.push({
      type: "permission_request",
      interactionId,
      tool,
      summary: tool,
    });
    this.scriptReady = true;
    const response = await responsePromise;
    return { interactionId, response };
  }
}
