// F-06textreminder text
// text typed error text handler text used/cap text

export class ReminderQuotaExceededError extends Error {
  constructor(
    public readonly used: number,
    public readonly cap: number,
  ) {
    super(`reminders quota: ${used}/${cap}`);
    this.name = "ReminderQuotaExceededError";
  }
}
