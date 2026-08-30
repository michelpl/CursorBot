import type { IMessenger } from "../../core/messenger/IMessenger.js";
import type { RateLimiter } from "../../core/rateLimit/RateLimiter.js";
import { logger } from "../../logger.js";
import { rateLimitedMessageText } from "../../util/rateLimitMessages.js";

// F-06 PR ctextmessenger text
// text"text"text main() text
// text integration test text fake messenger text/text

export async function rateLimitGuard(opts: {
  limiter: RateLimiter;
  messenger: IMessenger;
  chatId: string;
  userId: number;
  // text "msg"text string text RateLimiter API text
  // text guard text
  key: "msg";
}): Promise<boolean> {
  const r = opts.limiter.check(opts.userId, opts.key);
  if (r.allowed) return true;

  // text deny text logger.warntext owner text
  logger.warn(
    { userId: opts.userId, key: opts.key, retryMs: r.retryAfterMs },
    "rate limited",
  );
  // text plain parseModetextretry-after text"."text HTML text
  // plain text USAGE / text
  await opts.messenger.sendText(
    opts.chatId,
    rateLimitedMessageText(r.retryAfterMs),
    { parseMode: "plain" },
  );
  return false;
}
