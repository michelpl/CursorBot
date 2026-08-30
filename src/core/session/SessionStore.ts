import { JsonStore } from "../persist/jsonStore.js";
import { z } from "zod";

// text agentId text Agent.resume() text
export interface SessionEntry {
  agentId?: string;
  model?: string;
  modelParams?: Array<{ id: string; value: string }>;
}

interface SessionFile {
  workspaces: Record<string, SessionEntry>;
}

const SessionEntrySchema = z.object({
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
 * text workspace name text SessionEntrytext
 *
 * - text set / clear text flushtext
 * - JsonStore text set text
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
  }

  get(workspaceId: string): SessionEntry | undefined {
    return this.state.workspaces[workspaceId];
  }

  async set(workspaceId: string, entry: SessionEntry): Promise<void> {
    this.state.workspaces[workspaceId] = entry;
    await this.store.write(this.state);
  }

  async clear(workspaceId: string): Promise<void> {
    delete this.state.workspaces[workspaceId];
    await this.store.write(this.state);
  }
}
