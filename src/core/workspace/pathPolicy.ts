import { realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

// F-07textworkspace text
// text realpath text symlinktext resolve + sep text /repo_evil
// text sibling text startsWith('/repo') text

function isWithinRoot(path: string, root: string): boolean {
  const p = resolve(path);
  const r = resolve(root);
  return p === r || p.startsWith(r + sep);
}

export async function isPathWithinAllowedRoots(
  path: string,
  roots: string[],
): Promise<boolean> {
  if (roots.length === 0) return true;
  const realPath = await realpath(path);
  const realRoots = await Promise.all(roots.map((r) => realpath(r)));
  return realRoots.some((root) => isWithinRoot(realPath, root));
}
