import { describe, it, expect } from "vitest";
import { redactSensitive } from "../../src/logger.js";

describe("redactSensitive", () => {
  it("text botToken text ***", () => {
    const out = redactSensitive({ botToken: "1234:abcdef" });
    expect(out).toEqual({ botToken: "***" });
  });

  it("text apiKey text ***", () => {
    const out = redactSensitive({ apiKey: "secret" });
    expect(out).toEqual({ apiKey: "***" });
  });

  it("text", () => {
    const out = redactSensitive({
      cursor: { apiKey: "sk-...", model: "auto" },
      telegram: { botToken: "t1", parseMode: "HTML" },
    });
    expect(out).toEqual({
      cursor: { apiKey: "***", model: "auto" },
      telegram: { botToken: "***", parseMode: "HTML" },
    });
  });

  it("text", () => {
    const out = redactSensitive({ a: 1, b: "ok" });
    expect(out).toEqual({ a: 1, b: "ok" });
  });

  it("text", () => {
    const out = redactSensitive([{ apiKey: "x" }, { ok: true }]);
    expect(out).toEqual([{ apiKey: "***" }, { ok: true }]);
  });
});
