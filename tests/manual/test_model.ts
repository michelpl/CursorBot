// text ModelSelection text Agent.create + text sendtext
// text"text + params text API key text"text
//
// textlist_models text variants text web/cloud text SDK local
// text SDK text status=ERROR text result text
// API key plan / text local text
//
// text: CURSOR_API_KEY=... npx tsx tests/manual/test_model.ts
//
// text model text
import { Agent } from "@cursor/sdk";

async function main(): Promise<void> {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error("set CURSOR_API_KEY first");
    process.exit(1);
  }
  const model = {
    id: "gpt-5.3-codex",
    params: [
      { id: "reasoning", value: "extra-high" },
      { id: "fast", value: "false" },
    ],
  };
  console.log("model =", JSON.stringify(model, null, 2));
  const agent = await Agent.create({
    apiKey,
    model,
    local: { cwd: process.cwd(), settingSources: ["project", "user"] },
  });
  console.log("agentId:", agent.agentId);
  console.log("text prompt text");
  const run = await agent.send("text");
  for await (const e of run.stream()) {
    console.log("[event]", e.type, JSON.stringify(e).slice(0, 200));
  }
  const r = await run.wait();
  console.log("wait result:", JSON.stringify(r));
  await agent[Symbol.asyncDispose]();
  console.log("OK");
}

main().catch((e) => {
  console.error("FAIL:", (e as Error).message);
  process.exit(1);
});
