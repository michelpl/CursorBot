import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApprovedPlanStore } from "../../src/core/plans/ApprovedPlanStore.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ap-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("ApprovedPlanStore", () => {
  it("save and get by workspace", async () => {
    const store = new ApprovedPlanStore(join(dir, "plans.json"));
    await store.init();
    await store.set("default", {
      workspaceId: "default",
      chatId: "c1",
      name: "Test plan",
      plan: "# Steps\n1. Do thing",
      approvedAt: Date.now(),
    });
    expect(store.get("default")?.plan).toContain("Do thing");
  });

  it("persists across reload", async () => {
    const path = join(dir, "plans.json");
    const a = new ApprovedPlanStore(path);
    await a.init();
    await a.set("ws", {
      workspaceId: "ws",
      chatId: "c1",
      plan: "body",
      approvedAt: 1,
    });
    const b = new ApprovedPlanStore(path);
    await b.init();
    expect(b.get("ws")?.plan).toBe("body");
  });

  it("clear removes plan", async () => {
    const store = new ApprovedPlanStore(join(dir, "plans.json"));
    await store.init();
    await store.set("ws", {
      workspaceId: "ws",
      chatId: "c1",
      plan: "x",
      approvedAt: 1,
    });
    await store.clear("ws");
    expect(store.get("ws")).toBeUndefined();
  });
});
