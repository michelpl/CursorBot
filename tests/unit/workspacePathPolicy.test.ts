import { mkdtemp, mkdir, realpath, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isPathWithinAllowedRoots } from "../../src/core/workspace/pathPolicy.js";

let dir: string | undefined;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("workspace path policy", () => {
  it("text allowed root text", async () => {
    dir = await mkdtemp(join(tmpdir(), "ws-policy-"));
    const root = join(dir, "repo");
    const child = join(root, "child");
    await mkdir(child, { recursive: true });
    expect(await isPathWithinAllowedRoots(child, [root])).toBe(true);
  });

  it("text sibling text/repo_evil text /repo", async () => {
    dir = await mkdtemp(join(tmpdir(), "ws-policy-"));
    const root = join(dir, "repo");
    const evil = join(dir, "repo_evil");
    await mkdir(root, { recursive: true });
    await mkdir(evil, { recursive: true });
    expect(await isPathWithinAllowedRoots(evil, [root])).toBe(false);
  });

  it("text realpath text symlinktext root text", async () => {
    dir = await mkdtemp(join(tmpdir(), "ws-policy-"));
    const root = join(dir, "repo");
    const outside = join(dir, "outside");
    const link = join(root, "link-outside");
    await mkdir(root, { recursive: true });
    await mkdir(outside, { recursive: true });
    await symlink(outside, link);
    expect(await isPathWithinAllowedRoots(await realpath(link), [root])).toBe(
      false,
    );
  });
});
