import { resolve } from "node:path";
import { Command } from "commander";
import { loadConfig } from "../config/loadConfig.js";
import { logger } from "../logger.js";
import { ServiceLock } from "../core/service/ServiceLock.js";
import { isProcessAlive } from "../core/service/processAlive.js";
import { runBot } from "./runBot.js";

export interface ServiceStatusOutput {
  running: boolean;
  stale?: boolean;
  pid?: number;
  startedAt?: string;
  configPath?: string;
  cwd?: string;
  startedBy?: string;
}

export async function getServiceStatus(configPath: string): Promise<ServiceStatusOutput> {
  const cfg = await loadConfig({ configPath });
  const lock = new ServiceLock(cfg.paths.dataDir);
  const status = await lock.readStatus();
  if (!status.record) {
    return { running: false };
  }
  return {
    running: status.running,
    stale: status.stale,
    pid: status.record.pid,
    startedAt: status.record.startedAt,
    configPath: status.record.configPath,
    cwd: status.record.cwd,
    startedBy: status.record.startedBy,
  };
}

export async function stopService(
  configPath: string,
  timeoutMs = 15_000,
): Promise<{ stopped: boolean; message: string }> {
  const cfg = await loadConfig({ configPath });
  const lock = new ServiceLock(cfg.paths.dataDir);
  const status = await lock.readStatus();

  if (!status.record) {
    return { stopped: true, message: "Cursor Supervisor is not running (no lock file)" };
  }

  if (!status.running) {
    await lock.release();
    return {
      stopped: true,
      message: `removed stale lock (pid ${status.record.pid} was not alive)`,
    };
  }

  const pid = status.record.pid;
  try {
    process.kill(pid, "SIGTERM");
  } catch (e) {
    return {
      stopped: false,
      message: `failed to signal pid ${pid}: ${(e as Error).message}`,
    };
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      await lock.release();
      return { stopped: true, message: `stopped pid ${pid}` };
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return {
    stopped: false,
    message: `pid ${pid} did not exit within ${timeoutMs}ms`,
  };
}

function buildProgram(): Command {
  const program = new Command()
    .name("cursor-supervisor")
    .description("Telegram ↔ Cursor ACP bridge")
    .version("0.2.0");

  const configOption = ["--config-path <path>", "Path to config.json", "./config.json"] as const;

  program
    .command("run", { isDefault: true })
    .description("Start the Cursor Supervisor service")
    .option(...configOption)
    .option("--started-by <source>", "Lock metadata: cli or extension", "cli")
    .action(async (opts: { configPath: string; startedBy: string }) => {
      const startedBy = opts.startedBy === "extension" ? "extension" : "cli";
      await runBot({ configPath: opts.configPath, startedBy });
    });

  program
    .command("status")
    .description("Show service status")
    .option(...configOption)
    .option("--json", "Output JSON")
    .action(async (opts: { configPath: string; json?: boolean }) => {
      const abs = resolve(opts.configPath);
      const out = await getServiceStatus(abs);
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(out)}\n`);
      } else if (out.running) {
        process.stdout.write(
          `running (pid ${out.pid}, since ${out.startedAt}, config ${out.configPath})\n`,
        );
      } else if (out.stale) {
        process.stdout.write(`stale lock (pid ${out.pid} not alive)\n`);
      } else {
        process.stdout.write("not running\n");
      }
    });

  program
    .command("stop")
    .description("Stop the running service")
    .option(...configOption)
    .option("--timeout-ms <ms>", "Grace period before reporting failure", "15000")
    .action(async (opts: { configPath: string; timeoutMs: string }) => {
      const abs = resolve(opts.configPath);
      const result = await stopService(abs, Number(opts.timeoutMs));
      if (result.stopped) {
        process.stdout.write(`${result.message}\n`);
      } else {
        process.stderr.write(`${result.message}\n`);
        process.exit(1);
      }
    });

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  try {
    await buildProgram().parseAsync(argv);
  } catch (e) {
    logger.error({ err: (e as Error).message }, "fatal");
    process.exit(1);
  }
}
