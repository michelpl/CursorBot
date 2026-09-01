import { describe, it, expect } from "vitest";
import {
  acpSpawnOptions,
  resolveAgentCliPath,
} from "../../src/adapters/acp/AcpProcess.js";

describe("resolveAgentCliPath", () => {
  it("returns absolute paths unchanged", () => {
    expect(resolveAgentCliPath("C:\\tools\\agent.cmd")).toBe("C:\\tools\\agent.cmd");
  });

  it("on Windows resolves bare agent to agent.cmd when installed", () => {
    if (process.platform !== "win32") return;
    const resolved = resolveAgentCliPath("agent");
    expect(resolved).toMatch(/agent\.cmd$/i);
  });
});

describe("acpSpawnOptions", () => {
  it("uses shell on Windows for bare agent name", () => {
    if (process.platform !== "win32") return;
    expect(acpSpawnOptions("agent")).toEqual({ shell: true });
  });

  it("uses shell on Windows for .cmd paths", () => {
    if (process.platform !== "win32") return;
    expect(acpSpawnOptions("C:\\cursor-agent\\agent.cmd")).toEqual({ shell: true });
  });

  it("does not use shell for unix absolute paths", () => {
    expect(acpSpawnOptions("/usr/local/bin/agent")).toEqual({ shell: false });
  });
});
