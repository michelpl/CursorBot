import * as vscode from "vscode";

export const CONFIG_VIEW_ID = "cursorSupervisor.configView";

export type ConfigViewSnapshot = {
  hasWorkspace: boolean;
  enabled: boolean;
  running: boolean;
  configExists: boolean;
  telegramConfigured: boolean;
  cursorConfigured: boolean;
};

export type ConfigViewHost = {
  getSnapshot(): Promise<ConfigViewSnapshot>;
  setEnabled(enabled: boolean): Promise<void>;
  saveSecrets(input: {
    telegramBotToken: string;
    cursorApiKey: string;
  }): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
};

type WebviewMessage =
  | { type: "ready" }
  | { type: "setEnabled"; enabled: boolean }
  | { type: "saveSecrets"; telegramBotToken: string; cursorApiKey: string }
  | { type: "start" }
  | { type: "stop" };

export class ConfigViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = CONFIG_VIEW_ID;

  private view?: vscode.WebviewView;

  constructor(private readonly host: ConfigViewHost) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.renderHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((raw: unknown) => {
      void this.onMessage(raw);
    });
  }

  async refresh(): Promise<void> {
    if (!this.view) return;
    const snapshot = await this.host.getSnapshot();
    await this.view.webview.postMessage({ type: "snapshot", snapshot });
  }

  private async onMessage(raw: unknown): Promise<void> {
    const msg = raw as WebviewMessage;
    if (!msg || typeof msg !== "object" || !("type" in msg)) return;
    switch (msg.type) {
      case "ready":
        await this.refresh();
        break;
      case "setEnabled":
        await this.host.setEnabled(msg.enabled);
        await this.refresh();
        break;
      case "saveSecrets":
        await this.host.saveSecrets({
          telegramBotToken: msg.telegramBotToken,
          cursorApiKey: msg.cursorApiKey,
        });
        await this.refresh();
        break;
      case "start":
        await this.host.start();
        await this.refresh();
        break;
      case "stop":
        await this.host.stop();
        await this.refresh();
        break;
      default:
        break;
    }
  }

  private renderHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root { color-scheme: light dark; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 12px;
      margin: 0;
    }
    h1 { font-size: 13px; font-weight: 600; margin: 0 0 12px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
    .muted { color: var(--vscode-descriptionForeground); font-size: 12px; margin: 0 0 12px; }
    .status { margin-bottom: 14px; font-size: 12px; }
    label.field { display: block; font-size: 12px; margin: 0 0 4px; }
    input[type="password"] {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 10px;
      padding: 6px 8px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, transparent);
    }
    button {
      width: 100%;
      margin-top: 6px;
      padding: 6px 8px;
      cursor: pointer;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: none;
    }
    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    .switch { position: relative; width: 36px; height: 20px; flex: 0 0 auto; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; inset: 0; cursor: pointer; border-radius: 10px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
    }
    .slider:before {
      content: ""; position: absolute; height: 14px; width: 14px; left: 2px; top: 2px;
      background: var(--vscode-foreground); border-radius: 50%; transition: transform .15s;
    }
    .switch input:checked + .slider { background: var(--vscode-button-background); }
    .switch input:checked + .slider:before { transform: translateX(16px); background: var(--vscode-button-foreground); }
    .hidden { display: none; }
  </style>
</head>
<body>
  <h1>Cursor Supervisor</h1>
  <p id="noWorkspace" class="muted hidden">Open a workspace folder to configure the plugin.</p>
  <div id="panel">
    <div class="row">
      <span>Enable</span>
      <label class="switch">
        <input id="enabled" type="checkbox" />
        <span class="slider"></span>
      </label>
    </div>
    <div id="status" class="status muted"></div>
    <div class="row">
      <button id="start" type="button">Start</button>
    </div>
    <div class="row">
      <button id="stop" type="button" class="secondary">Stop</button>
    </div>
    <label class="field" for="telegram">Telegram bot token</label>
    <input id="telegram" type="password" autocomplete="off" spellcheck="false" />
    <p id="telegramHint" class="muted"></p>
    <label class="field" for="cursorKey">Cursor API key</label>
    <input id="cursorKey" type="password" autocomplete="off" spellcheck="false" />
    <p id="cursorHint" class="muted"></p>
    <button id="save" type="button">Save keys</button>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const enabledEl = document.getElementById("enabled");
    const telegramEl = document.getElementById("telegram");
    const cursorEl = document.getElementById("cursorKey");
    const statusEl = document.getElementById("status");
    const telegramHint = document.getElementById("telegramHint");
    const cursorHint = document.getElementById("cursorHint");
    const panel = document.getElementById("panel");
    const noWorkspace = document.getElementById("noWorkspace");

    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || data.type !== "snapshot") return;
      const s = data.snapshot;
      noWorkspace.classList.toggle("hidden", s.hasWorkspace);
      panel.classList.toggle("hidden", !s.hasWorkspace);
      enabledEl.checked = !!s.enabled;
      statusEl.textContent = s.running ? "Service: running" : "Service: stopped";
      telegramHint.textContent = s.telegramConfigured
        ? "Configured. Leave blank to keep the current token."
        : "Not set.";
      cursorHint.textContent = s.cursorConfigured
        ? "Configured. Leave blank to keep the current key."
        : "Not set.";
      telegramEl.placeholder = s.telegramConfigured ? "••••••••" : "";
      cursorEl.placeholder = s.cursorConfigured ? "••••••••" : "";
    });

    enabledEl.addEventListener("change", () => {
      vscode.postMessage({ type: "setEnabled", enabled: enabledEl.checked });
    });
    document.getElementById("save").addEventListener("click", () => {
      vscode.postMessage({
        type: "saveSecrets",
        telegramBotToken: telegramEl.value,
        cursorApiKey: cursorEl.value,
      });
      telegramEl.value = "";
      cursorEl.value = "";
    });
    document.getElementById("start").addEventListener("click", () => {
      vscode.postMessage({ type: "start" });
    });
    document.getElementById("stop").addEventListener("click", () => {
      vscode.postMessage({ type: "stop" });
    });
    vscode.postMessage({ type: "ready" });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
