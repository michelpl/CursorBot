import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SessionStore,
  isLegacySdkAgentId,
} from "../../src/core/session/SessionStore.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ss-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("SessionStore", () => {
  it("get returns undefined for unknown workspace", async () => {
    const ss = new SessionStore(join(dir, "sessions.json"));
    await ss.init();
    expect(ss.get("default")).toBeUndefined();
  });

  it("set + get sessionId", async () => {
    const ss = new SessionStore(join(dir, "sessions.json"));
    await ss.init();
    await ss.set("default", { sessionId: "session-x" });
    expect(ss.get("default")?.sessionId).toBe("session-x");
  });

  it("clear removes entry", async () => {
    const ss = new SessionStore(join(dir, "sessions.json"));
    await ss.init();
    await ss.set("default", { sessionId: "session-x" });
    await ss.clear("default");
    expect(ss.get("default")).toBeUndefined();
  });

  it("persists across reload", async () => {
    const p = join(dir, "sessions.json");
    const a = new SessionStore(p);
    await a.init();
    await a.set("default", { sessionId: "session-y" });

    const b = new SessionStore(p);
    await b.init();
    expect(b.get("default")).toEqual({ sessionId: "session-y" });
  });

  it("migrates legacy agentId to sessionId on read", async () => {
    const p = join(dir, "sessions.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      p,
      JSON.stringify({ workspaces: { default: { agentId: "legacy-id" } } }),
      "utf8",
    );
    const ss = new SessionStore(p);
    await ss.init();
    expect(ss.get("default")?.sessionId).toBe("legacy-id");
  });

  it("ignores legacy SDK agentId on read and purges on init", async () => {
    expect(
      isLegacySdkAgentId("agent-43f3af49-615c-4836-acb7-7559047b326c"),
    ).toBe(true);
    const p = join(dir, "sessions.json");
    const { writeFile, readFile } = await import("node:fs/promises");
    await writeFile(
      p,
      JSON.stringify({
        workspaces: {
          default: {
            agentId: "agent-43f3af49-615c-4836-acb7-7559047b326c",
            model: "default",
          },
        },
      }),
      "utf8",
    );
    const ss = new SessionStore(p);
    await ss.init();
    expect(ss.get("default")).toBeUndefined();
    const raw = JSON.parse(await readFile(p, "utf8")) as {
      workspaces: Record<string, unknown>;
    };
    expect(raw.workspaces.default).toBeUndefined();
  });
});
