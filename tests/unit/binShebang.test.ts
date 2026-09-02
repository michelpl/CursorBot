import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// text smoke texttsup banner text bin text shebangtext
// text shebangtextdist text shebangtextnode text SyntaxErrortext

describe("bin shebang source policy", () => {
  it("CLI source entry does not duplicate tsup banner shebang", async () => {
    const src = await readFile("src/bin/cursor-supervisor.ts", "utf8");
    expect(src.startsWith("#!")).toBe(false);
  });
});
