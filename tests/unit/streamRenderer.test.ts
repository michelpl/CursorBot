import { describe, it, expect, beforeEach, vi } from "vitest";
import { StreamRenderer } from "../../src/core/orchestrator/streamRenderer.js";
import { StubMessenger } from "../helpers/StubMessenger.js";

// text M2 polishtext chunk markdown text bugtext
// textAgentOrchestrator text chunk text markdownToHtmltext
//        SDK text ** / ` / [ ] text chunk text regex text
// textStreamRenderer text raw markdowntextcompose text
describe("StreamRenderer", () => {
  let messenger: StubMessenger;
  let renderer: StreamRenderer;

  beforeEach(async () => {
    vi.useFakeTimers();
    messenger = new StubMessenger();
    renderer = new StreamRenderer(messenger, "c1", {
      throttleMs: 10,
      maxLen: 3000,
    });
    await renderer.start("text");
  });

  // text editText text
  function lastEditText(): string {
    const last = [...messenger.calls]
      .reverse()
      .find((c) => c.kind === "editText");
    return last && last.kind === "editText" ? last.text : "";
  }

  it("text chunk **bold** text finalize text <b>", async () => {
    await renderer.pushText("**A");
    await renderer.pushText("B**");
    await vi.advanceTimersByTimeAsync(50);
    await renderer.finalize();
    expect(lastEditText()).toContain("<b>AB</b>");
    expect(lastEditText()).not.toContain("**");
  });

  it("text chunk text `code` text <code>", async () => {
    await renderer.pushText("text `co");
    await renderer.pushText("de` text");
    await vi.advanceTimersByTimeAsync(50);
    await renderer.finalize();
    expect(lastEditText()).toContain("<code>code</code>");
  });

  it("text chunk text <pre><code>", async () => {
    await renderer.pushText("```ts\n");
    await renderer.pushText("const x = 1;\n");
    await renderer.pushText("```");
    await vi.advanceTimersByTimeAsync(50);
    await renderer.finalize();
    const text = lastEditText();
    expect(text).toContain("<pre><code>");
    expect(text).toContain("const x = 1;");
  });

  it("text chunk text [text](url) text <a>", async () => {
    await renderer.pushText("text [link](htt");
    await renderer.pushText("ps://x.com) text");
    await vi.advanceTimersByTimeAsync(50);
    await renderer.finalize();
    expect(lastEditText()).toContain('<a href="https://x.com">link</a>');
  });

  it("agent text < > & text escapetext Telegram HTML", async () => {
    await renderer.pushText("if a < b && c > d");
    await vi.advanceTimersByTimeAsync(50);
    await renderer.finalize();
    const text = lastEditText();
    expect(text).toContain("&lt;");
    expect(text).toContain("&gt;");
    expect(text).toContain("&amp;");
  });

  it("finalize(extra) text extra text HTMLtext markdownToHtml text", async () => {
    await renderer.pushText("hello");
    await renderer.finalize("\n<i>(text)</i>");
    const text = lastEditText();
    expect(text).toContain("hello");
    expect(text).toContain("<i>(text)</i>");
    // extra text < > text escape text &lt;
    expect(text).not.toContain("&lt;i&gt;");
  });

  it("status text textBuffer textstatus text HTMLtexttextBuffer text raw markdown text", async () => {
    renderer.setStatus("text <b>tool</b>");
    await renderer.pushText("**done**");
    await vi.advanceTimersByTimeAsync(50);
    await renderer.finalize();
    const text = lastEditText();
    expect(text).toContain("<b>done</b>");
  });
});
