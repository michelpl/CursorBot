import { describe, it, expect } from "vitest";
import { ConfigSchema } from "../../src/config/schema.js";

// F-06 PR ctextrateLimit text schema text + text
describe("ConfigSchema rateLimit", () => {
  it("text configtext rateLimittext", () => {
    const cfg = ConfigSchema.parse({
      telegram: { botToken: "x", allowedUserIds: [1] },
      cursor: { apiKey: "y" },
    });
    expect(cfg.rateLimit.message.capacity).toBe(4);
    expect(cfg.rateLimit.message.refillPerSec).toBe(2);
    expect(cfg.rateLimit.agentCreate.capacity).toBe(10);
    expect(cfg.rateLimit.agentCreate.refillPerSec).toBeCloseTo(10 / 60);
    expect(cfg.rateLimit.reminders.maxPerUser).toBe(100);
  });

  it("text", () => {
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
    expect(cfg.rateLimit.agentCreate.capacity).toBe(10);
  });
});
