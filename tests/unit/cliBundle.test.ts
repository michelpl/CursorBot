import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("CLI dist bundle", () => {
  it("inlines npm dependencies so the VSIX can run without node_modules", async () => {
    const js = await readFile("dist/bin/cursor-supervisor.js", "utf8");
    expect(js).not.toMatch(/from ["']commander["']/);
    expect(js).not.toMatch(/from ["']grammy["']/);
    expect(js).not.toMatch(/from ["']zod["']/);
  });
});
