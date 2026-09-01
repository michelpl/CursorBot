import { describe, it, expect } from "vitest";
import { evaluateAudit } from "../../src/util/evaluateAudit.js";

describe("audit-security allowlist", () => {
  it("allows F-02 undici accepted-risk chain", () => {
    const r = evaluateAudit({
      vulnerabilities: {
        undici: {
          severity: "high",
          via: [{ source: 1114638 }, { source: 1114640 }],
        },
        "@connectrpc/connect-node": {
          severity: "moderate",
          via: ["undici"],
        },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
  });

  it("blocks unallowlisted high vulnerability", () => {
    const r = evaluateAudit({
      vulnerabilities: {
        evil: {
          severity: "high",
          via: [{ source: 999999 }],
        },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.failures[0]).toContain("evil");
  });

  it("blocks allowlisted package with unknown advisory source", () => {
    const r = evaluateAudit({
      vulnerabilities: {
        undici: {
          severity: "high",
          via: [{ source: 1234567 }],
        },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.failures[0]).toContain("1234567");
  });
});
