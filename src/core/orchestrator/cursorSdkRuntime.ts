import { Agent } from "@cursor/sdk";
import type { SDKAgent, Run } from "@cursor/sdk";
import type {
  IAgentRuntime,
  RuntimeAgent,
  RuntimeRun,
  RuntimeStreamEvent,
  CreateAgentOptions,
  ResumeAgentOptions,
} from "./runtime.js";
import { logger } from "../../logger.js";

/**
 * text IAgentRuntime text @cursor/sdktext
 *
 * text
 * - SDK text Run.stream text SDKMessage uniontextsystem/user/assistant/tool_call/thinking/status/...text
 *   text orchestrator text assistant text + thinking + tool_call text
 * - SDK text force text SendOptions.local.forcetext forcetext
 * - LocalAgent text model textfallback text SDK text "default"text "auto"text
 *   "auto" text SDK text ConfigurationError text
 */
export class CursorSdkRuntime implements IAgentRuntime {
  constructor(private readonly apiKey: string) {}

  async create(opts: CreateAgentOptions): Promise<RuntimeAgent> {
    const model = opts.model
      ? { id: opts.model.id, params: opts.model.params }
      : { id: "default" };
    logger.info({ cwd: opts.cwd, model }, "Agent.create");
    const sdk = await Agent.create({
      apiKey: this.apiKey,
      agentId: opts.agentId,
      model,
      local: {
        cwd: opts.cwd,
        settingSources: opts.settingSources ?? ["project", "user"],
        // F-10text sandboxOptions text SDKtext sandbox.json text
        // text SDK text
        ...(opts.sandboxOptions ? { sandboxOptions: opts.sandboxOptions } : {}),
      },
      mcpServers: opts.mcpServers as
        | Parameters<typeof Agent.create>[0]["mcpServers"]
        | undefined,
    });
    return new SdkAgentWrapper(sdk);
  }

  async resume(agentId: string, opts: ResumeAgentOptions): Promise<RuntimeAgent> {
    const sdk = await Agent.resume(agentId, {
      apiKey: this.apiKey,
      model: opts.model
        ? { id: opts.model.id, params: opts.model.params }
        : undefined,
      local: {
        cwd: opts.cwd,
        settingSources: opts.settingSources ?? ["project", "user"],
        // F-10text create text
        ...(opts.sandboxOptions ? { sandboxOptions: opts.sandboxOptions } : {}),
      },
    });
    return new SdkAgentWrapper(sdk);
  }
}

class SdkAgentWrapper implements RuntimeAgent {
  agentId: string;
  constructor(private readonly inner: SDKAgent) {
    this.agentId = inner.agentId;
  }

  async send(
    text: string,
    opts?: {
      force?: boolean;
      images?: Array<{ data: string; mimeType: string }>;
    },
  ): Promise<RuntimeRun> {
    // M2textSDK text send(message, options) text images text messagetextSDKUserMessagetext
    // text SendOptionstext images text
    const message =
      opts?.images && opts.images.length > 0
        ? { text, images: opts.images }
        : text;
    const run = await this.inner.send(
      message,
      opts?.force ? { local: { force: true } } : undefined,
    );
    return new SdkRunWrapper(run);
  }

  async dispose(): Promise<void> {
    await this.inner[Symbol.asyncDispose]();
  }
}

class SdkRunWrapper implements RuntimeRun {
  status: "running" | "finished" | "error" | "cancelled" = "running";

  constructor(private readonly inner: Run) {
    this.status = inner.status;
    // text SDK text status text wrappertextcancel/finish text orchestrator text
    inner.onDidChangeStatus((s) => {
      this.status = s;
    });
  }

  async *stream(): AsyncGenerator<RuntimeStreamEvent, void> {
    for await (const e of this.inner.stream()) {
      switch (e.type) {
        case "assistant": {
          for (const block of e.message.content) {
            if (block.type === "text") {
              yield { type: "assistant", text: block.text };
            }
          }
          break;
        }
        case "thinking":
          yield { type: "thinking", text: e.text };
          break;
        case "tool_call":
          yield {
            type: "tool_call",
            status: e.status,
            name: e.name,
            args: e.args,
          };
          break;
        case "status":
          // SDK textstatus=ERROR + message="...."
          logger.info(
            { status: e.status, message: e.message },
            "sdk status event",
          );
          break;
        case "system":
          logger.debug({ subtype: e.subtype, model: e.model }, "sdk system");
          break;
        case "task":
          logger.debug({ status: e.status, text: e.text }, "sdk task");
          break;
        default:
          break;
      }
    }
  }

  async wait(): Promise<{
    status: "finished" | "error" | "cancelled";
    result?: string;
    durationMs?: number;
  }> {
    const r = await this.inner.wait();
    return {
      status: r.status,
      result: r.result,
      durationMs: r.durationMs,
    };
  }

  async cancel(): Promise<void> {
    await this.inner.cancel();
  }
}
