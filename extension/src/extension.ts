import * as vscode from "vscode";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ServiceClient,
  resolveConfigPath,
  workspaceHasConfig,
  type ServiceStatus,
} from "./serviceClient";
import { runSetupWizard } from "./setupWizard";

type BarState = "stopped" | "starting" | "running" | "error";

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBar.command = "cursorSupervisor.showStatus";
  context.subscriptions.push(statusBar);

  let barState: BarState = "stopped";
  let lastError = "";
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  function getWorkspaceRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return folders[0].uri.fsPath;
    }
    // Extension Development Host may open before a folder is selected
    const ext = context.extensionPath.replace(/\\/g, "/");
    if (ext.endsWith("/extension")) {
      return ext.slice(0, -"/extension".length).replace(/\//g, "\\");
    }
    return undefined;
  }

  function resolveConfig(root: string, setting: string): string {
    const fromSetting = resolveConfigPath(root, setting);
    if (existsSync(fromSetting)) return fromSetting;
    const atRoot = join(root, "config.json");
    if (existsSync(atRoot)) return atRoot;
    const parent = join(dirname(root), "config.json");
    if (existsSync(parent)) return parent;
    return fromSetting;
  }

  function getSettings() {
    const cfg = vscode.workspace.getConfiguration("cursorSupervisor");
    const root = getWorkspaceRoot();
    if (!root) {
      return null;
    }
    return {
      autoStart: cfg.get<boolean>("autoStart", false),
      configPath: resolveConfig(
        root,
        cfg.get<string>("configPath", "${workspaceFolder}/config.json"),
      ),
      nodePath: cfg.get<string>("nodePath", "node"),
      executablePath: cfg.get<string>("executablePath", ""),
      detach: cfg.get<boolean>("detach", true),
      pollMs: cfg.get<number>("statusPollIntervalMs", 5000),
      workspaceRoot: root,
    };
  }

  function makeClient(): ServiceClient | undefined {
    const s = getSettings();
    if (!s) return undefined;
    return new ServiceClient({
      workspaceRoot: s.workspaceRoot,
      configPath: s.configPath,
      nodePath: s.nodePath,
      executablePath: s.executablePath,
      detach: s.detach,
      extensionPath: context.extensionPath,
    });
  }

  function renderBar(status?: ServiceStatus): void {
    switch (barState) {
      case "starting":
        statusBar.text = "$(sync~spin) Cursor Supervisor: starting…";
        statusBar.tooltip = "Starting Cursor Supervisor…";
        statusBar.backgroundColor = undefined;
        break;
      case "running":
        statusBar.text = status?.pid
          ? `$(pass-filled) Cursor Supervisor: running (pid ${status.pid})`
          : "$(pass-filled) Cursor Supervisor: running";
        statusBar.tooltip = formatStatusTooltip(status);
        statusBar.backgroundColor = undefined;
        break;
      case "error":
        statusBar.text = "$(error) Cursor Supervisor: error";
        statusBar.tooltip = lastError || "An error occurred";
        statusBar.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground",
        );
        break;
      default:
        statusBar.text = "$(circle-slash) Cursor Supervisor: stopped";
        statusBar.tooltip = "Click for status — use Cursor Supervisor: Start to run";
        statusBar.backgroundColor = undefined;
    }
    statusBar.show();
  }

  function formatStatusTooltip(status?: ServiceStatus): string {
    if (!status?.running) return "Cursor Supervisor is not running";
    const lines = [
      `PID: ${status.pid}`,
      `Since: ${status.startedAt}`,
      `Config: ${status.configPath}`,
      `CWD: ${status.cwd}`,
      `Started by: ${status.startedBy}`,
    ];
    return lines.join("\n");
  }

  function formatSince(iso?: string): string {
    if (!iso) return "unknown";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  async function refreshStatus(): Promise<ServiceStatus | undefined> {
    const client = makeClient();
    if (!client) {
      barState = "stopped";
      renderBar();
      return undefined;
    }
    try {
      const status = await client.getStatus();
      if (barState !== "starting") {
        barState = status.running ? "running" : "stopped";
      }
      if (status.running) barState = "running";
      lastError = "";
      renderBar(status);
      return status;
    } catch (e) {
      if (barState !== "starting") {
        barState = "error";
        lastError = (e as Error).message;
        renderBar();
      }
      return undefined;
    }
  }

  function startPolling(): void {
    const s = getSettings();
    if (!s) return;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => void refreshStatus(), s.pollMs);
    context.subscriptions.push({ dispose: () => clearInterval(pollTimer!) });
  }

  async function handleRunningConflict(
    status: ServiceStatus,
    source: "start" | "autostart",
  ): Promise<"use" | "restart" | "cancel"> {
    const choice = await vscode.window.showWarningMessage(
      `Cursor Supervisor is already running (PID ${status.pid}, since ${formatSince(status.startedAt)}).`,
      { modal: true },
      "Use existing instance",
      "Stop and restart",
      "Cancel",
    );
    if (choice === "Use existing instance") return "use";
    if (choice === "Stop and restart") return "restart";
    if (source === "autostart") return "cancel";
    return "cancel";
  }

  async function doStart(source: "manual" | "autostart" = "manual"): Promise<void> {
    const client = makeClient();
    if (!client) {
      void vscode.window.showErrorMessage("Open a workspace folder to use Cursor Supervisor.");
      return;
    }

    const s = getSettings();
    if (!(await workspaceHasConfig(s.configPath))) {
      if (source === "autostart") return;
      const created = await runSetupWizard(s.configPath);
      if (!created || !(await workspaceHasConfig(s.configPath))) {
        void vscode.window.showErrorMessage(
          `config.json not found at ${s.configPath}`,
        );
        barState = "error";
        lastError = "config.json not found";
        renderBar();
        return;
      }
    }

    let status: ServiceStatus | undefined;
    try {
      status = await client.getStatus();
    } catch (e) {
      barState = "error";
      lastError = (e as Error).message;
      renderBar();
      void vscode.window.showErrorMessage(lastError);
      return;
    }

    if (status.running) {
      const action = await handleRunningConflict(
        status,
        source === "autostart" ? "autostart" : "start",
      );
      if (action === "cancel" || action === "use") {
        if (action === "use") {
          barState = "running";
          renderBar(status);
        }
        return;
      }
      if (action === "restart") {
        try {
          await client.stop();
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          void vscode.window.showErrorMessage((e as Error).message);
          return;
        }
      }
    } else if (status.stale) {
      try {
        await client.stop();
      } catch {
        /* best effort */
      }
    }

    barState = "starting";
    renderBar();
    try {
      await client.start();
      await new Promise((r) => setTimeout(r, 800));
      const after = await client.getStatus();
      if (after.running) {
        barState = "running";
        renderBar(after);
        if (source === "manual") {
          void vscode.window.showInformationMessage(
            `Cursor Supervisor started (pid ${after.pid}).`,
          );
        }
      } else {
        barState = "error";
        lastError = "Service did not report running after start";
        renderBar();
        void vscode.window.showErrorMessage(lastError);
      }
    } catch (e) {
      barState = "error";
      lastError = (e as Error).message;
      renderBar();
      void vscode.window.showErrorMessage(lastError);
    }
  }

  async function doStop(): Promise<void> {
    const client = makeClient();
    if (!client) return;
    try {
      const msg = await client.stop();
      barState = "stopped";
      renderBar();
      void vscode.window.showInformationMessage(msg);
    } catch (e) {
      barState = "error";
      lastError = (e as Error).message;
      renderBar();
      void vscode.window.showErrorMessage(lastError);
    }
  }

  async function doShowStatus(): Promise<void> {
    const client = makeClient();
    if (!client) {
      void vscode.window.showInformationMessage("No workspace folder open.");
      return;
    }
    try {
      const status = await client.getStatus();
      if (status.running) {
        void vscode.window.showInformationMessage(
          `Cursor Supervisor running — PID ${status.pid}, since ${formatSince(status.startedAt)}`,
          { modal: false },
        );
      } else if (status.stale) {
        void vscode.window.showWarningMessage(
          `Stale lock (pid ${status.pid} not alive). Use Stop to clear or Start to replace.`,
        );
      } else {
        void vscode.window.showInformationMessage("Cursor Supervisor is not running.");
      }
      barState = status.running ? "running" : "stopped";
      renderBar(status);
    } catch (e) {
      void vscode.window.showErrorMessage((e as Error).message);
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorSupervisor.start", () => doStart("manual")),
    vscode.commands.registerCommand("cursorSupervisor.stop", () => doStop()),
    vscode.commands.registerCommand("cursorSupervisor.showStatus", () => doShowStatus()),
  );

  renderBar();
  void refreshStatus();
  startPolling();

  void (async () => {
    const s = getSettings();
    if (!s.autoStart) return;
    if (!(await workspaceHasConfig(s.configPath))) return;
    const client = makeClient();
    if (!client) return;
    try {
      const status = await client.getStatus();
      if (!status.running) {
        await doStart("autostart");
      } else {
        barState = "running";
        renderBar(status);
      }
    } catch {
      /* ignore autostart errors */
    }
  })();
}

export function deactivate(): void {
  /* polling cleared via subscriptions */
}
