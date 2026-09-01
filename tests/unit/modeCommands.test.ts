import { describe, it, expect } from "vitest";
import { parseModeCommand } from "../../src/commands/modeCommands.js";
import { parseCommand } from "../../src/commands/parser.js";

describe("parseModeCommand", () => {
  it("parses /plan with task", () => {
    const cmd = parseCommand("/plan fix the test");
    expect(cmd.type).toBe("command");
    if (cmd.type !== "command") return;
    const mode = parseModeCommand(cmd);
    expect(mode).toEqual({ kind: "prompt", mode: "plan", text: "fix the test" });
  });

  it("/agent without text is set-only", () => {
    const cmd = parseCommand("/agent");
    if (cmd.type !== "command") throw new Error("expected command");
    expect(parseModeCommand(cmd)).toEqual({ kind: "set-only", mode: "agent" });
  });

  it("/plan without text returns help", () => {
    const cmd = parseCommand("/plan");
    if (cmd.type !== "command") throw new Error("expected command");
    expect(parseModeCommand(cmd)).toEqual({ kind: "help", mode: "plan" });
  });

  it("returns undefined for /help", () => {
    const cmd = parseCommand("/help");
    if (cmd.type !== "command") throw new Error("expected command");
    expect(parseModeCommand(cmd)).toBeUndefined();
  });
});
