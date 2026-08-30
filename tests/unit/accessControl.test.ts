import { describe, it, expect } from "vitest";
import { AccessControl } from "../../src/core/access/AccessControl.js";

describe("AccessControl", () => {
  it("text text allow", () => {
    const ac = new AccessControl([1, 2, 3]);
    expect(ac.isAllowed(1)).toBe(true);
    expect(ac.isAllowed(3)).toBe(true);
  });

  it("text text deny", () => {
    const ac = new AccessControl([1, 2]);
    expect(ac.isAllowed(99)).toBe(false);
  });

  it("text text text deny", () => {
    const ac = new AccessControl([]);
    expect(ac.isAllowed(1)).toBe(false);
  });

  it("primary userId text", () => {
    const ac = new AccessControl([42, 7]);
    expect(ac.primaryUserId()).toBe(42);
  });
});
