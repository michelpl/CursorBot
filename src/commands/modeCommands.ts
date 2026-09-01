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
      return "Uso: /plan <tarefa>\nElabora um plano no modo plan do Cursor.";
    case "agent":
      return (
        "Uso:\n/agent — ativa modo agent\n/agent <prompt> — executa no modo agent\n" +
        "Para executar plano guardado: /agent executar o plano (ou --plan)"
      );
    case "ask":
      return "Uso: /ask <pergunta>\nResponde no modo ask (read-only).";
  }
}
