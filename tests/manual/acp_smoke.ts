/**
 * Manual smoke test — requires `agent` on PATH and CURSOR_API_KEY.
 * Usage: npx tsx tests/manual/acp_smoke.ts
 */
import { AcpProcess } from "../../src/adapters/acp/AcpProcess.js";
import { AcpSession } from "../../src/adapters/acp/AcpSession.js";

const apiKey = process.env.CURSOR_API_KEY;
if (!apiKey) {
  console.error("Set CURSOR_API_KEY");
  process.exit(1);
}

const cwd = process.cwd();
const proc = new AcpProcess({ agentCliPath: "agent", apiKey, cwd });
await proc.start();

const session = await AcpSession.connect(proc, {
  agentCliPath: "agent",
  apiKey,
  mode: "agent",
  cwd,
});

console.log("sessionId:", session.sessionId);

const run = await session.prompt("Responda apenas: ok");
for await (const e of run.events()) {
  console.log("event:", JSON.stringify(e).slice(0, 200));
}

console.log("status:", run.status, "result:", run.result);
await session.dispose();
