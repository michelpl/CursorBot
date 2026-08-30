import { Bot } from "grammy";

// text Bot text M1 text
export function createBot(token: string) {
  return new Bot(token);
}

export type GrammyBot = ReturnType<typeof createBot>;
