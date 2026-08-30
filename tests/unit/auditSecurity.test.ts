import { describe, it, expect } from "vitest";
// @ts-expect-error text Node CLI text .mjs text node text
import { evaluateAudit } from "../../scripts/audit-security.mjs";

// F-04 PR #12textCI audit gate text
// text F-02 undici chain text Accepted-Risktext

describe("audit-security allowlist", () => {
  it("text F-02 undici accepted-risk chain", () => {
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
        "@cursor/sdk": {
          severity: "moderate",
          via: ["@connectrpc/connect-node"],
        },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
  });

  it("text high vulnerability", () => {
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

  it("text allowlisted package text advisory source", () => {
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
