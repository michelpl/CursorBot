// F-09text Telegram text prompt injection text
// text F-10 sandboxOptionstext
// text/text

export function wrapUserPrompt(raw: string): string {
  return [
    "text Telegram text",
    "text <user_request> text",
    "<user_request>",
    raw,
    "</user_request>",
  ].join("\n");
}
