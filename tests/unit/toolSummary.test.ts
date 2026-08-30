import { describe, it, expect } from "vitest";
import { summarizeTool } from "../../src/core/orchestrator/toolSummary.js";

describe("summarizeTool", () => {
  it("shell text command", () => {
    expect(summarizeTool("shell", { command: "pnpm test" })).toBe("shell: pnpm test");
  });

  it("read text path", () => {
    expect(summarizeTool("read", { path: "src/auth.ts" })).toBe("read: src/auth.ts");
  });

  it("read text relative_path text", () => {
    expect(summarizeTool("read", { relative_path: "src/x.ts" })).toBe("read: src/x.ts");
  });

  it("grep text pattern", () => {
    expect(summarizeTool("grep", { pattern: "TODO" })).toBe("grep: TODO");
  });

  it("text 60 text", () => {
    const long = "a".repeat(120);
    const out = summarizeTool("shell", { command: long });
    expect(out.length).toBeLessThanOrEqual("shell: ".length + 60 + 1);
    expect(out.endsWith("text")).toBe(true);
  });

  it("text text text name", () => {
    expect(summarizeTool("nonsense", { whatever: 1 })).toBe("nonsense");
  });

  it("args text / null text text", () => {
    expect(summarizeTool("shell", undefined)).toBe("shell: ");
    expect(summarizeTool("shell", null)).toBe("shell: ");
  });

  it("task text description", () => {
    expect(summarizeTool("task", { description: "review the patch" })).toBe(
      "subagent: review the patch",
    );
  });
});
