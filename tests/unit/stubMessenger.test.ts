import { describe, it, expect } from "vitest";
import { StubMessenger } from "../helpers/StubMessenger.js";

describe("StubMessenger", () => {
  it("sendText text messageId", async () => {
    const m = new StubMessenger();
    const a = await m.sendText("c1", "hi");
    const b = await m.sendText("c1", "ho");
    expect(a.messageId).toBe("m-1");
    expect(b.messageId).toBe("m-2");
    expect(m.calls).toHaveLength(2);
    expect(m.calls[0]).toEqual({ kind: "sendText", chatId: "c1", text: "hi" });
  });

  it("editText text", async () => {
    const m = new StubMessenger();
    await m.editText("c1", "m-1", "edited");
    expect(m.calls[0]).toEqual({
      kind: "editText",
      chatId: "c1",
      messageId: "m-1",
      text: "edited",
    });
  });

  it("emit text text", async () => {
    const m = new StubMessenger();
    const got: string[] = [];
    m.on("text", (msg) => got.push(msg.text));
    m.emitText({ chatId: "c1", userId: 1, text: "hello" });
    expect(got).toEqual(["hello"]);
  });
});
