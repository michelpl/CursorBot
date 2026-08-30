import type { Reminder, ReminderStore } from "./ReminderStore.js";
import { ReminderQuotaExceededError } from "./errors.js";

export interface ReminderQuotaOptions {
  maxPerUser: number;
}

/**
 * F-06textReminder text
 *
 * text ReminderStore text
 * - ReminderStore text / list / add / remove
 * - ReminderQuota text add text createdBy text cap text
 *
 * text Pick<ReminderStore, "list" | "add">text ReminderScheduler
 * text list/addtext fake storetext
 */
export class ReminderQuota {
  constructor(
    private readonly store: Pick<ReminderStore, "list" | "add">,
    private readonly opts: ReminderQuotaOptions,
  ) {}

  async checkAndAdd(item: Reminder): Promise<void> {
    const used = this.store
      .list()
      .filter((r) => r.createdBy === item.createdBy).length;
    if (used >= this.opts.maxPerUser) {
      throw new ReminderQuotaExceededError(used, this.opts.maxPerUser);
    }
    await this.store.add(item);
  }
}
