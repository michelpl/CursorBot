import { PendingInteractionStore } from "../../src/core/interactions/PendingInteractionStore.js";

export async function makeInteractionStore(
  timeoutMs = 300_000,
): Promise<PendingInteractionStore> {
  const store = new PendingInteractionStore({ timeoutMs });
  await store.init();
  return store;
}
