import { describe, it, expect } from "vitest";
import { parseTimeExpr } from "../../src/core/reminders/timeParser.js";

const NOW = new Date("2026-05-05T16:00:00Z").getTime(); // UTC

describe("parseTimeExpr", () => {
  it("text10m", () => {
    const r = parseTimeExpr("10m", { now: NOW, tz: "UTC", maxAheadDays: 30 });
    expect(r.at).toBe(NOW + 10 * 60 * 1000);
  });
  it("text1h30m", () => {
    const r = parseTimeExpr("1h30m", {
      now: NOW,
      tz: "UTC",
      maxAheadDays: 30,
    });
    expect(r.at).toBe(NOW + (60 + 30) * 60 * 1000);
  });
  it("text45s", () => {
    const r = parseTimeExpr("45s", { now: NOW, tz: "UTC", maxAheadDays: 30 });
    expect(r.at).toBe(NOW + 45 * 1000);
  });
  it("text2d", () => {
    const r = parseTimeExpr("2d", { now: NOW, tz: "UTC", maxAheadDays: 30 });
    expect(r.at).toBe(NOW + 2 * 86400 * 1000);
  });
  it("text HH:MM text text text", () => {
    const r = parseTimeExpr("18:30", {
      now: NOW,
      tz: "UTC",
      maxAheadDays: 30,
    });
    expect(r.at).toBe(new Date("2026-05-05T18:30:00Z").getTime());
  });
  it("text HH:MM text text text", () => {
    const r = parseTimeExpr("09:00", {
      now: NOW,
      tz: "UTC",
      maxAheadDays: 30,
    });
    expect(r.at).toBe(new Date("2026-05-06T09:00:00Z").getTime());
  });
  it("text2026-05-06 09:00", () => {
    const r = parseTimeExpr("2026-05-06 09:00", {
      now: NOW,
      tz: "UTC",
      maxAheadDays: 30,
    });
    expect(r.at).toBe(new Date("2026-05-06T09:00:00Z").getTime());
  });
  it("text text text", () => {
    const r = parseTimeExpr("hello", {
      now: NOW,
      tz: "UTC",
      maxAheadDays: 30,
    });
    expect(r.error).toBeDefined();
    expect(r.at).toBe(0);
  });
  it("text maxAheadDays text text", () => {
    const r = parseTimeExpr("2027-01-01 09:00", {
      now: NOW,
      tz: "UTC",
      maxAheadDays: 30,
    });
    expect(r.error).toMatch(/30/);
  });
});
