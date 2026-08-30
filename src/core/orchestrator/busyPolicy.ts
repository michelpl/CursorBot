// text reminders text

export type BusyAction = "run" | "reject" | "force-replace";
export type RunStatus = "running" | "finished" | "error" | "cancelled";

/**
 * text "!" text { force: true, text }text
 * text !fix this text run text /cancel text
 */
export function parseForcePrefix(text: string): { force: boolean; text: string } {
  if (text.startsWith("!")) {
    return { force: true, text: text.slice(1) };
  }
  return { force: false, text };
}

/**
 * text run text + force text prompttext
 * - text run / text text text run
 * - text force text rejecttext /cancel text ! text
 * - text force text force-replacetextSDK send text force=true text runtext
 */
export function decideBusyAction(input: {
  activeRunStatus: RunStatus | undefined;
  force: boolean;
}): BusyAction {
  if (!input.activeRunStatus || input.activeRunStatus !== "running") return "run";
  return input.force ? "force-replace" : "reject";
}
