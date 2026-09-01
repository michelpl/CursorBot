import { describe, it, expect } from "vitest";
import { ConfigSchema } from "../../src/config/schema.js";

describe("ConfigSchema rateLimit", () => {
  it("defaults rateLimit buckets", () => {
    const cfg = ConfigSchema.parse({
      telegram: { botToken: "x", allowedUserIds: [1] },
      cursor: { apiKey: "y" },
    });
    expect(cfg.rateLimit.message.capacity).toBe(4);
    expect(cfg.rateLimit.message.refillPerSec).toBe(2);
    expect(cfg.rateLimit.sessionCreate.capacity).toBe(10);
    expect(cfg.rateLimit.sessionCreate.refillPerSec).toBeCloseTo(10 / 60);
    expect(cfg.rateLimit.reminders.maxPerUser).toBe(100);
  });

  it("allows partial rateLimit override", () => {
    const cfg = ConfigSchema.parse({
      telegram: { botToken: "x", allowedUserIds: [1] },
      cursor: { apiKey: "y" },
      rateLimit: {
        message: { capacity: 2, refillPerSec: 1 },
        reminders: { maxPerUser: 50 },
      },
    });
    expect(cfg.rateLimit.message.capacity).toBe(2);
    expect(cfg.rateLimit.message.refillPerSec).toBe(1);
    expect(cfg.rateLimit.reminders.maxPerUser).toBe(50);
    expect(cfg.rateLimit.sessionCreate.capacity).toBe(10);
  });
});
