import { describe, it, expect } from "vitest";
import { JsonRpcClient, MemoryLineTransport } from "../../src/adapters/acp/JsonRpcClient.js";
import { AcpSession } from "../../src/adapters/acp/AcpSession.js";

function mockAcpServer(transport: MemoryLineTransport): void {
  const origWrite = transport.write.bind(transport);
  transport.write = (line: string) => {
    origWrite(line);
    void handleClientLine(line);
  };

  async function handleClientLine(line: string): Promise<void> {
    const msg = JSON.parse(line) as { id?: number; method?: string };
    if (msg.id !== undefined && msg.method === "initialize") {
      transport.receive(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }));
    } else if (msg.id !== undefined && msg.method === "authenticate") {
      transport.receive(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }));
    } else if (msg.id !== undefined && msg.method === "session/new") {
      transport.receive(
        JSON.stringify({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            sessionId: "sess-test-1",
            modes: {
              currentModeId: "agent",
              availableModes: [
                { id: "agent", name: "Agent" },
                { id: "plan", name: "Plan" },
              ],
            },
          },
        }),
      );
    } else if (msg.id !== undefined && msg.method === "session/set_mode") {
      transport.receive(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }));
      transport.receive(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "session/update",
          params: {
            update: { sessionUpdate: "current_mode_update", modeId: "plan" },
          },
        }),
      );
    } else if (msg.id !== undefined && msg.method === "session/prompt") {
      transport.receive(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "session/update",
          params: {
            update: {
              sessionUpdate: "agent_message_chunk",
              content: { text: "Olá" },
            },
          },
        }),
      );
      transport.receive(
        JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { stopReason: "end_turn" } }),
      );
    }
  }
}

describe("AcpSession (mock stdio)", () => {
  it("initializes, creates session, streams assistant chunks", async () => {
    const transport = new MemoryLineTransport();
    mockAcpServer(transport);

    const session = await AcpSession.connect(transport, {
      agentCliPath: "agent",
      mode: "agent",
      cwd: process.cwd(),
    });
    expect(session.sessionId).toBe("sess-test-1");
    expect(session.getMode()).toBe("agent");
    expect(session.getAvailableModes().map((m) => m.id)).toContain("plan");

    await session.setMode("plan");
    expect(session.getMode()).toBe("plan");

    const run = await session.prompt("hello");
    const events: unknown[] = [];
    for await (const e of run.events()) {
      events.push(e);
    }
    expect(events.some((e) => (e as { kind?: string }).kind === "assistant")).toBe(true);
    await session.dispose();
  });
});

describe("JsonRpcClient", () => {
  it("correlates request/response", async () => {
    const transport = new MemoryLineTransport();
    const rpc = new JsonRpcClient(transport);
    const p = rpc.request("ping", { x: 1 });
    const sent = JSON.parse(transport.written[0]!) as { id: number; method: string };
    transport.receive(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: "pong" }));
    await expect(p).resolves.toBe("pong");
    await rpc.close();
  });
});
