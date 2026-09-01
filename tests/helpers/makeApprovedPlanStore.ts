import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ApprovedPlanStore,
  approvedPlanStorePath,
} from "../../src/core/plans/ApprovedPlanStore.js";

export async function makeApprovedPlanStore(
  dir?: string,
): Promise<{ store: ApprovedPlanStore; dir: string }> {
  const root = dir ?? (await mkdtemp(join(tmpdir(), "plans-")));
  const store = new ApprovedPlanStore(approvedPlanStorePath(root));
  await store.init();
  return { store, dir: root };
}
