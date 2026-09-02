import { describe, it, expect } from "vitest";
import {
  buildExecutionPrompt,
  shouldInjectApprovedPlan,
  stripPlanFlag,
} from "../../src/core/orchestrator/planPrompt.js";

describe("planPrompt", () => {
  it("detects execution keywords", () => {
    expect(shouldInjectApprovedPlan("execute the plan")).toBe(true);
    expect(shouldInjectApprovedPlan("run plan now")).toBe(true);
    expect(shouldInjectApprovedPlan("hello")).toBe(false);
    expect(shouldInjectApprovedPlan("go --plan")).toBe(true);
  });

  it("strips --plan flag", () => {
    expect(stripPlanFlag("go --plan")).toBe("go");
  });

  it("builds execution prompt with plan body", () => {
    const out = buildExecutionPrompt("execute", "# Plan\nstep 1");
    expect(out).toContain("# Plan");
    expect(out).toContain("execute");
    expect(out).toContain("APPROVED PLAN");
  });
});
