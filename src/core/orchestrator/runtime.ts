// text @cursor/sdk text
// 1) text StubRuntime text orchestrator text
// 2) text / text SDK text orchestratortext

export interface IAgentRuntime {
  create(opts: CreateAgentOptions): Promise<RuntimeAgent>;
  resume(agentId: string, opts: ResumeAgentOptions): Promise<RuntimeAgent>;
}

export interface CreateAgentOptions {
  agentId?: string;
  cwd: string;
  model?: { id: string; params?: Array<{ id: string; value: string }> };
  settingSources?: ("project" | "user" | "team" | "mdm" | "plugins" | "all")[];
  mcpServers?: Record<string, unknown>;
  // F-10text SDK text local.sandboxOptionstextenabled=true text Cursor SDK text
  // text ~/.cursor/sandbox.json text <workspace>/.cursor/sandbox.json text
  sandboxOptions?: { enabled: boolean };
}

export interface ResumeAgentOptions {
  cwd: string;
  model?: { id: string; params?: Array<{ id: string; value: string }> };
  settingSources?: ("project" | "user" | "team" | "mdm" | "plugins" | "all")[];
  // F-10text CreateAgentOptions.sandboxOptions textresume text
  // text session text
  sandboxOptions?: { enabled: boolean };
}

export interface RuntimeAgent {
  agentId: string;
  // M2text images text SDK text sendtext"text+text"text prompttext
  send(
    text: string,
    opts?: {
      force?: boolean;
      images?: Array<{ data: string; mimeType: string }>;
    },
  ): Promise<RuntimeRun>;
  dispose(): Promise<void>;
}

export interface RuntimeRun {
  status: "running" | "finished" | "error" | "cancelled";
  stream(): AsyncGenerator<RuntimeStreamEvent, void>;
  wait(): Promise<{
    status: "finished" | "error" | "cancelled";
    result?: string;
    durationMs?: number;
  }>;
  cancel(): Promise<void>;
}

// text SDK text orchestrator text
export type RuntimeStreamEvent =
  | { type: "assistant"; text: string }
  | { type: "thinking"; text: string }
  | {
      type: "tool_call";
      status: "running" | "completed" | "error";
      name: string;
      args?: unknown;
    };
