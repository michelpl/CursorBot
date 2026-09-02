import type { ParsedCommand } from "./parser.js";
import type { AcpMode } from "../adapters/acp/acpTypes.js";

const MODE_NAMES = new Set<string>(["plan", "agent", "ask"]);

export type ModeCommandResult =
  | { kind: "help"; mode: AcpMode }
  | { kind: "set-only"; mode: AcpMode }
  | { kind: "prompt"; mode: AcpMode; text: string };

/** Parse /plan, /agent, /ask as ACP mode commands (not bot dispatch commands). */
export function parseModeCommand(cmd: ParsedCommand): ModeCommandResult | undefined {
  if (!MODE_NAMES.has(cmd.name)) return undefined;
  const mode = cmd.name as AcpMode;
  const text = cmd.rest.trim();
  if (mode === "agent" && text === "") {
    return { kind: "set-only", mode };
  }
  if (text === "") {
    return { kind: "help", mode };
  }
  return { kind: "prompt", mode, text };
}

export function modeCommandHelp(mode: AcpMode): string {
  switch (mode) {
    case "plan":
      return "Usage: /plan <task>\nDraft a plan in Cursor plan mode.";
    case "agent":
      return (
        "Usage:\n/agent — switch to agent mode\n/agent <prompt> — run in agent mode\n" +
        "To run a saved plan: /agent execute the plan (or --plan)"
      );
    case "ask":
      return "Usage: /ask <question>\nAnswer in ask mode (read-only).";
  }
}
