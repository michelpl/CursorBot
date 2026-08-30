import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ImageGroupBuffer } from "../../src/adapters/telegram/ImageGroupBuffer.js";

describe("ImageGroupBuffer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("text groupId text", () => {
    const fired: string[][] = [];
    const buf = new ImageGroupBuffer<string>(200, (xs) => fired.push(xs));
    buf.push(undefined, "a");
    expect(fired).toEqual([["a"]]);
  });

  it("text groupId text debounce text", () => {
    const fired: string[][] = [];
    const buf = new ImageGroupBuffer<string>(200, (xs) => fired.push(xs));
    buf.push("g1", "a");
    vi.advanceTimersByTime(100);
    buf.push("g1", "b");
    vi.advanceTimersByTime(100);
    buf.push("g1", "c");
    expect(fired).toEqual([]);
    vi.advanceTimersByTime(199);
    expect(fired).toEqual([]);
    vi.advanceTimersByTime(2);
    expect(fired).toEqual([["a", "b", "c"]]);
  });

  it("text groupId text", () => {
    const fired: string[][] = [];
    const buf = new ImageGroupBuffer<string>(200, (xs) => fired.push(xs));
    buf.push("g1", "a");
    buf.push("g2", "x");
    vi.advanceTimersByTime(250);
    expect(fired.length).toBe(2);
    expect(fired).toContainEqual(["a"]);
    expect(fired).toContainEqual(["x"]);
  });

  it("dispose text", () => {
    const fired: string[][] = [];
    const buf = new ImageGroupBuffer<string>(200, (xs) => fired.push(xs));
    buf.push("g1", "a");
    buf.dispose();
    vi.advanceTimersByTime(500);
    expect(fired).toEqual([]);
  });
});
