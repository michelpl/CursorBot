/**
 * Debug ACP handshake step-by-step.
 * Usage: npx tsx tests/manual/acp_debug.ts
 */
import { loadConfig } from "../../src/config/loadConfig.js";
import { AcpProcess } from "../../src/adapters/acp/AcpProcess.js";
import { JsonRpcClient } from "../../src/adapters/acp/JsonRpcClient.js";

const cfg = await loadConfig({});
const apiKey = cfg.cursor.apiKey;
const keyHint =
  apiKey.length > 8 ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}` : "(short)";
console.log("apiKey hint:", keyHint);
if (/^\d+:[A-Za-z0-9_-]+$/.test(apiKey)) {
  console.warn(
    "AVISO: cursor.apiKey parece um token do Telegram (formato 123456:ABC…), não uma chave Cursor (key_…).",
  );
}

const cwd = process.cwd();
const proc = new AcpProcess({
  agentCliPath: cfg.cursor.agentCliPath,
  apiKey,
  cwd,
});
await proc.start();
const rpc = new JsonRpcClient(proc);

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    console.log(`OK ${name}`, JSON.stringify(result).slice(0, 200));
    return result;
  } catch (e) {
    console.error(`FAIL ${name}:`, (e as Error).message);
    process.exit(1);
  }
}

await step("initialize", () =>
  rpc.request("initialize", {
    protocolVersion: 1,
    clientCapabilities: {
      fs: { readTextFile: false, writeTextFile: false },
      terminal: false,
    },
    clientInfo: { name: "cursorbot-debug", version: "0.2.0" },
  }),
);

await step("authenticate", () =>
  rpc.request("authenticate", { methodId: "cursor_login" }),
);

await step("session/load (legacy SDK id)", () =>
  rpc.request("session/load", {
    sessionId: "agent-43f3af49-615c-4836-acb7-7559047b326c",
    cwd,
  }),
);

await step("session/new (with mode)", () =>
  rpc.request("session/new", {
    cwd,
    mode: cfg.cursor.acpMode,
    mcpServers: [],
  }),
);

await proc.close();
console.log("All steps passed.");
