import type {
  IAgentRuntime,
  RuntimeAgent,
  RuntimeRun,
  RuntimeStreamEvent,
  CreateAgentOptions,
  ResumeAgentOptions,
} from "../../src/core/orchestrator/runtime.js";

/**
 * text IAgentRuntime / RuntimeAgent / RuntimeRun text/text SDKtext
 * text StubRun text setScript() text"text"text
 */
export class StubAgentRuntime implements IAgentRuntime {
  public agents: StubAgent[] = [];
  // M2text create text resume text model text
  public created: CreateAgentOptions[] = [];
  public resumed: Array<{ agentId: string; opts: ResumeAgentOptions }> = [];

  async create(opts: CreateAgentOptions): Promise<RuntimeAgent> {
    const a = new StubAgent(opts.agentId ?? `agent-stub-${this.agents.length + 1}`);
    this.agents.push(a);
    this.created.push(opts);
    return a;
  }

  async resume(agentId: string, opts: ResumeAgentOptions): Promise<RuntimeAgent> {
    this.resumed.push({ agentId, opts });
    const a = new StubAgent(agentId);
    this.agents.push(a);
    return a;
  }
}

export class StubAgent implements RuntimeAgent {
  public sentTexts: string[] = [];
  // M2text send textforce / images text
  public lastSend?: {
    text: string;
    force?: boolean;
    images?: Array<{ data: string; mimeType: string }>;
  };
  public currentRun?: StubRun;
  constructor(public agentId: string) {}

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
  async dispose(): Promise<void> {}
}

export class StubRun implements RuntimeRun {
  status: "running" | "finished" | "error" | "cancelled" = "running";
  public scripted: RuntimeStreamEvent[] = [];
  private scriptReady = false;
  constructor(
    public text: string,
    public force: boolean,
  ) {}

  // text setScript text"text"text
  // text stream() text
  // text stream() text scriptReadytext
  setScript(events: RuntimeStreamEvent[]): void {
    this.scripted = events;
    this.scriptReady = true;
  }

  async *stream(): AsyncGenerator<RuntimeStreamEvent, void> {
    // text"text script" text "text cancel"text ~1s text
    let waited = 0;
    while (!this.scriptReady && this.status === "running" && waited < 200) {
      await new Promise((r) => setTimeout(r, 5));
      waited++;
    }
    for (const e of this.scripted) {
      if (this.status === "cancelled") break;
      yield e;
      // text StreamRenderer text throttle timer text
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
}
