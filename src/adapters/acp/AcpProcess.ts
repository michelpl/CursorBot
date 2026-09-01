import {
  spawn,
  execSync,
  type ChildProcessWithoutNullStreams,
  type SpawnOptions,
} from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import readline from "node:readline";
import { platform } from "node:os";
import { logger } from "../../logger.js";
import type { LineTransport } from "./JsonRpcClient.js";

export interface AcpProcessOptions {
  agentCliPath: string;
  apiKey?: string;
  cwd: string;
}

/**
 * Resolve bare CLI names to an absolute executable path.
 * Node subprocesses often inherit a PATH without cursor-agent (Windows).
 */
export function resolveAgentCliPath(agentCliPath: string): string {
  if (/[\\/]/.test(agentCliPath)) {
    return agentCliPath;
  }

  if (platform() === "win32") {
    try {
      const out = execSync(`where ${agentCliPath}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const first = out.trim().split(/\r?\n/)[0]?.trim();
      if (first && existsSync(first)) return first;
    } catch {
      /* not on PATH for this process */
    }

    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      for (const name of ["agent.cmd", "cursor-agent.cmd"]) {
        const candidate = join(localAppData, "cursor-agent", name);
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  return agentCliPath;
}

/** Windows .cmd/.bat launchers require shell; bare names too. */
export function acpSpawnOptions(resolvedPath: string): Pick<SpawnOptions, "shell"> {
  if (platform() !== "win32") return { shell: false };
  const needsShell =
    !/[\\/]/.test(resolvedPath) ||
    resolvedPath.endsWith(".cmd") ||
    resolvedPath.endsWith(".bat");
  return { shell: needsShell };
}

/** Spawns `agent acp` and exposes stdin/stdout as line transport. */
export class AcpProcess implements LineTransport {
  private proc?: ChildProcessWithoutNullStreams;
  private rl?: readline.Interface;
  private lineHandler?: (line: string) => void;
  private startError?: Error;
  private readonly resolvedPath: string;

  constructor(private readonly opts: AcpProcessOptions) {
    this.resolvedPath = resolveAgentCliPath(opts.agentCliPath);
  }

  async start(): Promise<void> {
    const args = ["acp"];
    const env = { ...process.env };
    if (this.opts.apiKey) {
      env.CURSOR_API_KEY = this.opts.apiKey;
    }

    const spawnOpts = acpSpawnOptions(this.resolvedPath);
    let settled = false;
    let stderrBuf = "";

    await new Promise<void>((resolve, reject) => {
      logger.info(
        { agentCliPath: this.opts.agentCliPath, resolvedPath: this.resolvedPath },
        "starting ACP process",
      );

      this.proc = spawn(this.resolvedPath, args, {
        cwd: this.opts.cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        ...spawnOpts,
      });

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        this.startError = err;
        reject(err);
      };

      this.proc.on("error", (err) => {
        logger.error(
          {
            err: err.message,
            agentCliPath: this.opts.agentCliPath,
            resolvedPath: this.resolvedPath,
            shell: spawnOpts.shell,
          },
          "acp process error",
        );
        fail(
          new Error(
            `Não foi possível iniciar o CLI ACP (${this.resolvedPath}): ${err.message}. ` +
              "Defina cursor.agentCliPath com o caminho completo para agent.cmd.",
          ),
        );
      });

      this.proc.on("spawn", () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      });

      this.proc.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString().slice(0, 500);
        stderrBuf += text;
        logger.warn({ stderr: text }, "acp stderr");
      });

      this.proc.on("exit", (code, signal) => {
        if (code !== null && code !== 0) {
          logger.warn({ code, signal, stderr: stderrBuf.slice(0, 200) }, "acp process exited");
          if (!settled) {
            fail(
              new Error(
                `CLI ACP encerrou com código ${code}. ` +
                  (stderrBuf.trim() || "Verifique cursor.agentCliPath e CURSOR_API_KEY."),
              ),
            );
          }
        }
      });

      this.rl = readline.createInterface({ input: this.proc.stdout });
      this.rl.on("line", (line) => {
        this.lineHandler?.(line);
      });
    });
  }

  write(line: string): void {
    if (this.startError) {
      throw this.startError;
    }
    if (!this.proc?.stdin.writable) {
      throw new Error("ACP process stdin not writable");
    }
    this.proc.stdin.write(`${line}\n`);
  }

  onLine(handler: (line: string) => void): () => void {
    this.lineHandler = handler;
    return () => {
      if (this.lineHandler === handler) this.lineHandler = undefined;
    };
  }

  async close(): Promise<void> {
    this.rl?.close();
    if (this.proc && !this.proc.killed) {
      this.proc.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        this.proc!.once("exit", () => resolve());
        setTimeout(() => {
          if (!this.proc?.killed) this.proc?.kill("SIGKILL");
          resolve();
        }, 5000);
      });
    }
    this.proc = undefined;
  }
}
