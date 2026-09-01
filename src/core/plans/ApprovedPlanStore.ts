import { join } from "node:path";
import { z } from "zod";
import { JsonStore } from "../persist/jsonStore.js";

export interface ApprovedPlanTodo {
  id: string;
  content: string;
  status: string;
}

export interface ApprovedPlan {
  workspaceId: string;
  chatId: string;
  name?: string;
  overview?: string;
  plan: string;
  todos?: ApprovedPlanTodo[];
  approvedAt: number;
}

interface ApprovedPlanFile {
  workspaces: Record<string, ApprovedPlan>;
}

const ApprovedPlanSchema = z.object({
  workspaceId: z.string(),
  chatId: z.string(),
  name: z.string().optional(),
  overview: z.string().optional(),
  plan: z.string(),
  todos: z
    .array(
      z.object({
        id: z.string(),
        content: z.string(),
        status: z.string(),
      }),
    )
    .optional(),
  approvedAt: z.number(),
});

const ApprovedPlanFileSchema = z.object({
  workspaces: z.record(ApprovedPlanSchema),
});

/** One approved plan per workspace for deferred execution. */
export class ApprovedPlanStore {
  private readonly store: JsonStore<ApprovedPlanFile>;
  private state: ApprovedPlanFile = { workspaces: {} };

  constructor(filePath: string) {
    this.store = new JsonStore<ApprovedPlanFile>(
      filePath,
      { workspaces: {} },
      (raw) => ApprovedPlanFileSchema.parse(raw),
    );
  }

  async init(): Promise<void> {
    this.state = await this.store.readOrInit();
  }

  get(workspaceId: string): ApprovedPlan | undefined {
    return this.state.workspaces[workspaceId];
  }

  async set(workspaceId: string, plan: ApprovedPlan): Promise<void> {
    this.state.workspaces[workspaceId] = plan;
    await this.store.write(this.state);
  }

  async clear(workspaceId: string): Promise<void> {
    delete this.state.workspaces[workspaceId];
    await this.store.write(this.state);
  }
}

export function approvedPlanStorePath(dataDir: string): string {
  return join(dataDir, "approved-plans.json");
}
