import type { PendingInteractionStore } from "./PendingInteractionStore.js";
import type { RuntimeInteractionResponse } from "../orchestrator/runtime.js";

export type RouteResult =
  | { action: "prompt" }
  | {
      action: "respond";
      interactionId: string;
      response: RuntimeInteractionResponse;
    };

/**
 * Decides whether an incoming Telegram message is a new prompt or a response
 * to a pending ACP interaction (open-ended question text).
 */
export class InteractionRouter {
  constructor(private readonly store: PendingInteractionStore) {}

  hasPending(chatId: string): boolean {
    return this.store.hasPending(chatId);
  }

  routeText(chatId: string, text: string): RouteResult {
    const pending = this.store.getByChatId(chatId);
    if (!pending) return { action: "prompt" };
    // Open-ended questions: free text reply
    if (pending.kind === "question") {
      return {
        action: "respond",
        interactionId: pending.interactionId,
        response: {
          kind: "question",
          answers: { freeform: [text] },
        },
      };
    }
    return { action: "prompt" };
  }

  routeCallback(
    chatId: string,
    callbackData: string,
  ): RouteResult | undefined {
    const pending = this.store.getByChatId(chatId);
    if (!pending) return undefined;

    const parts = callbackData.split(":");
    if (parts[0] !== "acp" || parts[1] !== pending.interactionId) return undefined;

    const action = parts[2];
    switch (pending.kind) {
      case "permission": {
        const optionId = action as "allow-once" | "allow-always" | "reject-once";
        if (!["allow-once", "allow-always", "reject-once"].includes(optionId)) {
          return undefined;
        }
        return {
          action: "respond",
          interactionId: pending.interactionId,
          response: { kind: "permission", optionId },
        };
      }
      case "question": {
        const questionId = parts[3];
        const optionId = parts[4];
        if (!questionId || !optionId) return undefined;
        const partial = { ...(pending.partialAnswers ?? {}) };
        const existing = partial[questionId] ?? [];
        partial[questionId] = [...existing, optionId];
        pending.partialAnswers = partial;
        // Single-select: respond immediately; multi-select needs "done" button
        if (action === "done") {
          return {
            action: "respond",
            interactionId: pending.interactionId,
            response: { kind: "question", answers: partial },
          };
        }
        return undefined;
      }
      case "plan": {
        if (action === "approve-save") {
          return {
            action: "respond",
            interactionId: pending.interactionId,
            response: { kind: "plan", accepted: true, save: true },
          };
        }
        if (action === "reject") {
          return {
            action: "respond",
            interactionId: pending.interactionId,
            response: { kind: "plan", accepted: false },
          };
        }
        return undefined;
      }
    }
  }
}
