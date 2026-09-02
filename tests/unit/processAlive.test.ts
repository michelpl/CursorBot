import { describe, it, expect } from "vitest";
import { isProcessAlive } from "../../src/core/service/processAlive.js";

describe("isProcessAlive", () => {
  it("returns true for current process", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it("returns false for invalid pids", () => {
    expect(isProcessAlive(0)).toBe(false);
    expect(isProcessAlive(-1)).toBe(false);
    expect(isProcessAlive(1.5)).toBe(false);
  });

  it("returns false for very unlikely pid", () => {
    // PID max on most systems is much lower than this
    expect(isProcessAlive(2_147_483_647)).toBe(false);
  });
});
