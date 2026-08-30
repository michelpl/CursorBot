// text Cursor text API key text + text parameterstext thinking efforttext
// text: CURSOR_API_KEY=... npx tsx tests/manual/list_models.ts
import { Cursor } from "@cursor/sdk";

async function main(): Promise<void> {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error("set CURSOR_API_KEY first");
    process.exit(1);
  }
  const list = await Cursor.models.list({ apiKey });
  for (const m of list) {
    console.log("text");
    console.log(`id: ${m.id}`);
    console.log(`display: ${m.displayName}`);
    if (m.description) console.log(`desc: ${m.description}`);
    if (m.parameters?.length) {
      for (const p of m.parameters) {
        const vals = p.values.map((v) => v.value).join(" | ");
        console.log(`  param ${p.id} (${p.displayName ?? ""}): ${vals}`);
      }
    }
    if (m.variants?.length) {
      console.log("  variants:");
      for (const v of m.variants) {
        const params = v.params.map((p) => `${p.id}=${p.value}`).join(", ");
        console.log(
          `    - ${v.displayName}${v.isDefault ? " *(default)*" : ""}: ${params}`,
        );
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
