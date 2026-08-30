import { describe, it, expect } from "vitest";
import { markdownToHtml } from "../../src/core/render/markdownToHtml.js";

describe("markdownToHtml", () => {
  it("text < > &", () => {
    expect(markdownToHtml("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  it("text text <code>", () => {
    expect(markdownToHtml("foo `bar` baz")).toBe("foo <code>bar</code> baz");
  });

  it("text text <b>", () => {
    expect(markdownToHtml("a **bold** b")).toBe("a <b>bold</b> b");
  });

  it("text_..._text <i>", () => {
    expect(markdownToHtml("a _it_ b")).toBe("a <i>it</i> b");
  });

  it("text ``` ... ``` text <pre><code>", () => {
    const md = "before\n```\nlet a = 1;\n```\nafter";
    const html = markdownToHtml(md);
    expect(html).toContain("<pre><code>let a = 1;\n</code></pre>");
    expect(html).toContain("before");
    expect(html).toContain("after");
  });

  it("text < > & text", () => {
    const md = "```\n<x> & </x>\n```";
    expect(markdownToHtml(md)).toContain(
      "<pre><code>&lt;x&gt; &amp; &lt;/x&gt;\n</code></pre>",
    );
  });

  it("text [text](url) text <a>", () => {
    expect(markdownToHtml("[hi](https://example.com)")).toBe(
      '<a href="https://example.com">hi</a>',
    );
  });

  it("text", () => {
    expect(markdownToHtml("")).toBe("");
  });
});
