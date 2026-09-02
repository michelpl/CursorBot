import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StubMessenger } from "../helpers/StubMessenger.js";
import { StubAgentRuntime } from "../helpers/StubAgent.js";
import { AgentOrchestrator } from "../../src/core/orchestrator/AgentOrchestrator.js";
import { WorkspaceRegistry } from "../../src/core/workspace/WorkspaceRegistry.js";
import { SessionStore } from "../../src/core/session/SessionStore.js";
import { PendingInteractionStore } from "../../src/core/interactions/PendingInteractionStore.js";
import { makeApprovedPlanStore } from "../helpers/makeApprovedPlanStore.js";

async function waitFor<T>(fn: () => T | undefined, retries = 200): Promise<T> {
  for (let i = 0; i < retries; i++) {
    const v = fn();
    if (v !== undefined) return v;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("waitFor timeout");
}

let dir: string;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function makeOrch() {
  dir = await mkdtemp(join(tmpdir(), "mode-orch-"));
  const registry = new WorkspaceRegistry(join(dir, "ws.json"));
  await registry.init({ autoRegisterCwd: true, cwd: dir });
  const session = new SessionStore(join(dir, "sess.json"));
  await session.init();
  const messenger = new StubMessenger();
  const runtime = new StubAgentRuntime();
  const interactionStore = new PendingInteractionStore({ timeoutMs: 300_000 });
  await interactionStore.init();
  const { store: approvedPlanStore } = await makeApprovedPlanStore(dir);
  const orch = new AgentOrchestrator({
    messenger,
    runtime,
    registry,
    session,
    streamOptions: { throttleMs: 1, maxLen: 1000 },
    acpMode: "agent",
    interactionStore,
    approvedPlanStore,
  });
  return { orch, messenger, runtime };
}

describe("AgentOrchestrator modes", () => {
  it("setSessionMode calls agent.setMode", async () => {
    const { orch, runtime } = await makeOrch();
    await orch.setSessionMode({ chatId: "c1", mode: "plan", userId: 0 });
    const agent = runtime.agents[0]!;
    expect(agent.modeChanges).toEqual(["plan"]);
    await orch.dispose();
  });

  it("runPrompt with mode calls setMode before send", async () => {
    const { orch, runtime, messenger } = await makeOrch();
    const p = orch.runPrompt({
      chatId: "c1",
      text: "task",
      force: false,
      userId: 0,
      mode: "plan",
    });
    const agent = await waitFor(() => runtime.agents[0]);
    const run = await waitFor(() => agent.currentRun);
    run.setScript([{ type: "assistant", text: "plan draft" }]);
    await p;
    expect(agent.modeChanges).toEqual(["plan"]);
    expect(
      messenger.sentTexts.some((t) => t.text.includes("Plan complete")),
    ).toBe(true);
    await orch.dispose();
  });

  it("plain text prompt does not call setMode", async () => {
    const { orch, runtime } = await makeOrch();
    const p = orch.runPrompt({ chatId: "c1", text: "hello", force: false, userId: 0 });
    const agent = await waitFor(() => runtime.agents[0]);
    expect(agent.modeChanges).toEqual([]);
    const run = await waitFor(() => agent.currentRun);
    run.setScript([{ type: "assistant", text: "hi" }]);
    await p;
    await orch.dispose();
  });
});
