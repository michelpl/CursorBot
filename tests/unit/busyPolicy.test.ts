import { describe, it, expect } from "vitest";
import {
  decideBusyAction,
  parseForcePrefix,
} from "../../src/core/orchestrator/busyPolicy.js";

describe("parseForcePrefix", () => {
  it("text ! text text force=truetext", () => {
    expect(parseForcePrefix("!fix this")).toEqual({ force: true, text: "fix this" });
  });
  it("text text force=false", () => {
    expect(parseForcePrefix("hello")).toEqual({ force: false, text: "hello" });
  });
  it("text ! text", () => {
    expect(parseForcePrefix("!")).toEqual({ force: true, text: "" });
  });
});

describe("decideBusyAction", () => {
  it("text run text run", () => {
    expect(decideBusyAction({ activeRunStatus: undefined, force: false })).toBe("run");
  });
  it("text run + text force text reject", () => {
    expect(decideBusyAction({ activeRunStatus: "running", force: false })).toBe("reject");
  });
  it("text run + force text force-replace", () => {
    expect(decideBusyAction({ activeRunStatus: "running", force: true })).toBe(
      "force-replace",
    );
  });
  it("text run text text run", () => {
    expect(decideBusyAction({ activeRunStatus: "finished", force: false })).toBe("run");
  });
});
