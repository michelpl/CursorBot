// Busy-run policy for concurrent prompts.

export type BusyAction = "run" | "reject" | "force-replace" | "respond";
export type RunStatus = "running" | "finished" | "error" | "cancelled";

/** Prefix "!" forces a new run, cancelling any active one. */
export function parseForcePrefix(text: string): { force: boolean; text: string } {
  if (text.startsWith("!")) {
    return { force: true, text: text.slice(1) };
  }
  return { force: false, text };
}

/**
 * Decide how to handle a new prompt when a run may already be active.
 * - No active run → run
 * - Pending ACP interaction → respond (route message as interaction reply)
 * - Active run + force → force-replace
 * - Active run + no pending → reject
 */
export function decideBusyAction(input: {
  activeRunStatus: RunStatus | undefined;
  force: boolean;
  hasPendingInteraction?: boolean;
}): BusyAction {
  if (input.hasPendingInteraction) return "respond";
  if (!input.activeRunStatus || input.activeRunStatus !== "running") return "run";
  return input.force ? "force-replace" : "reject";
}
