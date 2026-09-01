import { JsonStore } from "../persist/jsonStore.js";
import { z } from "zod";

/** ACP session id for session/load on resume. */
export interface SessionEntry {
  sessionId?: string;
}

/** Pre-ACP Cursor SDK agent ids (agent-{uuid}) — invalid for ACP session/load. */
export function isLegacySdkAgentId(id: string): boolean {
  return /^agent-[0-9a-f-]{36}$/i.test(id);
}

interface SessionFile {
  workspaces: Record<string, SessionEntry>;
}

const SessionEntrySchema = z.object({
  sessionId: z.string().optional(),
  // Legacy field — ignored on read, stripped on write
  agentId: z.string().optional(),
  model: z.string().optional(),
  modelParams: z
    .array(z.object({ id: z.string(), value: z.string() }))
    .optional(),
});

const SessionFileSchema = z.object({
  workspaces: z.record(SessionEntrySchema),
});

/**
 * Persists ACP session ids per workspace name.
 */
export class SessionStore {
  private readonly store: JsonStore<SessionFile>;
  private state: SessionFile = { workspaces: {} };

  constructor(filePath: string) {
    this.store = new JsonStore<SessionFile>(
      filePath,
      { workspaces: {} },
      (raw) => SessionFileSchema.parse(raw),
    );
  }

  async init(): Promise<void> {
    this.state = await this.store.readOrInit();
    let dirty = false;
    for (const [wsId, entry] of Object.entries(this.state.workspaces)) {
      const legacy = entry as SessionEntry & { agentId?: string };
      if (
        !entry.sessionId &&
        legacy.agentId &&
        isLegacySdkAgentId(legacy.agentId)
      ) {
        delete this.state.workspaces[wsId];
        dirty = true;
      }
    }
    if (dirty) await this.store.write(this.state);
  }

  get(workspaceId: string): SessionEntry | undefined {
    const entry = this.state.workspaces[workspaceId];
    if (!entry) return undefined;
    // Migrate non-SDK legacy agentId → sessionId if present
    const legacy = entry as SessionEntry & { agentId?: string };
    if (!entry.sessionId && legacy.agentId) {
      if (isLegacySdkAgentId(legacy.agentId)) return undefined;
      return { sessionId: legacy.agentId };
    }
    return { sessionId: entry.sessionId };
  }

  async set(workspaceId: string, entry: SessionEntry): Promise<void> {
    this.state.workspaces[workspaceId] = { sessionId: entry.sessionId };
    await this.store.write(this.state);
  }

  async clear(workspaceId: string): Promise<void> {
    delete this.state.workspaces[workspaceId];
    await this.store.write(this.state);
  }
}
