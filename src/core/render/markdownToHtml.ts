// HTML text markdown text
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * text markdown text Telegram HTML text
 *
 * text
 * - text
 * - text `code`
 * - **text** _text_
 * - [text](url)
 *
 * text
 * 1. text
 * 2. text HTML text <pre><code>...
 * 3. text HTML text ** text _ text
 */
export function markdownToHtml(input: string): string {
  if (!input) return "";

  const fenceRe = /```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```/g;
  const segments: Array<{ kind: "text" | "code"; value: string }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = fenceRe.exec(input)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ kind: "text", value: input.slice(lastIndex, m.index) });
    }
    segments.push({ kind: "code", value: m[1] ?? "" });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < input.length) {
    segments.push({ kind: "text", value: input.slice(lastIndex) });
  }

  return segments
    .map((s) => {
      if (s.kind === "code") {
        return `<pre><code>${escapeHtml(s.value)}\n</code></pre>`;
      }
      return renderInline(s.value);
    })
    .join("");
}

// text HTML text
function renderInline(text: string): string {
  let out = escapeHtml(text);

  // text text text _ * text
  out = out.replace(/`([^`\n]+)`/g, (_, inner: string) => `<code>${inner}</code>`);
  // text **...** text
  out = out.replace(/\*\*([^*\n]+)\*\*/g, (_, inner: string) => `<b>${inner}</b>`);
  // text _..._text __ text
  out = out.replace(
    /(^|[^_])_([^_\n]+)_(?!_)/g,
    (_, pre: string, inner: string) => `${pre}<i>${inner}</i>`,
  );
  // textURL text http(s) text javascript: text
  out = out.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_, label: string, url: string) => `<a href="${url}">${label}</a>`,
  );

  return out;
}
