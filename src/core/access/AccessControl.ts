/**
 * textM1 text
 * text allowedUserIds text messenger text droptext
 */
export class AccessControl {
  private readonly set: Set<number>;
  private readonly first?: number;

  constructor(allowedUserIds: number[]) {
    this.set = new Set(allowedUserIds);
    this.first = allowedUserIds[0];
  }

  isAllowed(userId: number): boolean {
    return this.set.has(userId);
  }

  // primary usertext reminders text"text"text
  primaryUserId(): number | undefined {
    return this.first;
  }
}
