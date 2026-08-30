// text Telegram / WeChat text "text" text "text"text
// text (Telegram text)text
//   /name [args...]
//   /name@BotUsername [args...]   text group text bot text Telegram text @suffix
//
// text
// text Command Handlers (T15) text

export interface ParsedText {
  type: "text";
  text: string;
}

export interface ParsedCommand {
  type: "command";
  name: string; // text /
  args: string[]; // text
  rest: string; // text payloadtext /remind text
}

export type ParseResult = ParsedText | ParsedCommand;

export function parseCommand(input: string): ParseResult {
  // text
  const trimmed = (input ?? "").trim();
  if (trimmed === "" || !trimmed.startsWith("/") || trimmed === "/") {
    return { type: "text", text: input ?? "" };
  }

  // text token text nametext rest
  // text rest textrest text
  const idxFirstSpace = trimmed.search(/\s/);
  let head: string;
  let rest: string;
  if (idxFirstSpace === -1) {
    head = trimmed.slice(1);
    rest = "";
  } else {
    head = trimmed.slice(1, idxFirstSpace);
    rest = trimmed.slice(idxFirstSpace + 1).trim();
  }

  // text @BotUsername textTelegram group text
  const atIdx = head.indexOf("@");
  if (atIdx !== -1) head = head.slice(0, atIdx);

  if (head === "") {
    // text "/  hello" text text
    return { type: "text", text: input };
  }

  const name = head.toLowerCase();
  const args = rest === "" ? [] : rest.split(/\s+/);
  return { type: "command", name, args, rest };
}
