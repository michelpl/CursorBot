import { logger } from "../../logger.js";
import type { JsonRpcMessage } from "./acpTypes.js";

export interface LineTransport {
  write(line: string): void;
  onLine(handler: (line: string) => void): () => void;
  close(): Promise<void>;
}

type RequestHandler = (params: unknown, rpcId: number) => Promise<unknown> | unknown;
type NotificationHandler = (params: unknown) => void;

/**
 * JSON-RPC 2.0 client over newline-delimited JSON.
 * Handles outbound requests and inbound server requests/notifications.
 */
export class JsonRpcClient {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private readonly requestHandlers = new Map<string, RequestHandler>();
  private readonly notificationHandlers = new Map<string, NotificationHandler>();
  private readonly unsub: () => void;

  constructor(private readonly transport: LineTransport) {
    this.unsub = transport.onLine((line) => {
      void this.handleLine(line);
    });
  }

  onRequest(method: string, handler: RequestHandler): void {
    this.requestHandlers.set(method, handler);
  }

  onNotification(method: string, handler: NotificationHandler): void {
    this.notificationHandlers.set(method, handler);
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    const id = this.nextId++;
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.transport.write(msg);
    });
  }

  respond(id: number, result: unknown): void {
    const msg = JSON.stringify({ jsonrpc: "2.0", id, result });
    this.transport.write(msg);
  }

  async close(): Promise<void> {
    this.unsub();
    for (const p of this.pending.values()) {
      p.reject(new Error("JsonRpcClient closed"));
    }
    this.pending.clear();
    await this.transport.close();
  }

  private async handleLine(line: string): Promise<void> {
    if (!line.trim()) return;
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(line) as JsonRpcMessage;
    } catch (e) {
      logger.warn({ err: (e as Error).message, line: line.slice(0, 200) }, "acp invalid json");
      return;
    }

    if ("id" in msg && msg.id !== undefined && ("result" in msg || "error" in msg)) {
      const waiter = this.pending.get(msg.id as number);
      if (!waiter) return;
      this.pending.delete(msg.id as number);
      const resp = msg as { error?: { message: string }; result?: unknown };
      if (resp.error) {
        waiter.reject(new Error(resp.error.message));
      } else {
        waiter.resolve(resp.result);
      }
      return;
    }

    if (!("method" in msg) || !msg.method) return;

    const handler = this.requestHandlers.get(msg.method);
    if (handler && "id" in msg && msg.id !== undefined) {
      try {
        const result = await handler(msg.params, msg.id as number);
        this.respond(msg.id as number, result);
      } catch (e) {
        this.respond(msg.id as number, {
          error: { code: -32000, message: (e as Error).message },
        });
      }
      return;
    }

    const notif = this.notificationHandlers.get(msg.method);
    if (notif) {
      notif(msg.params);
    }
  }
}

/** In-memory transport for unit tests. */
export class MemoryLineTransport implements LineTransport {
  private listeners: Array<(line: string) => void> = [];
  readonly written: string[] = [];

  write(line: string): void {
    this.written.push(line);
  }

  onLine(handler: (line: string) => void): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((h) => h !== handler);
    };
  }

  /** Simulate server -> client line. */
  receive(line: string): void {
    for (const h of this.listeners) h(line);
  }

  async close(): Promise<void> {
    this.listeners = [];
  }
}
