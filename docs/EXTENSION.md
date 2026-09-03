# Cursor Supervisor — IDE extension

Run the Telegram ↔ Cursor ACP bridge from Cursor without keeping a terminal open. Marketplace installs **bundle** the Node service (`server/bin/cursor-supervisor.js`). Developers can still spawn a locally built CLI from this repo.

## Prerequisites

1. Node.js **>= 20.10** on PATH (or set `cursorSupervisor.nodePath`).
2. Cursor agent CLI for ACP.
3. `.cursor-supervisor/config.json` in the workspace, or complete the first-run wizard.

Build from source:

```bash
npm install
npm run build
npm run extension:build
```

## Install locally

### Extension Development Host

1. Open this repository in Cursor.
2. Run `npm run extension:build` (or the `extension:build` task).
3. Press **F5** (Run Cursor Supervisor Extension).
4. **Cursor Supervisor: Start**, or open the **Cursor Supervisor** icon in the Primary Side Bar

### VSIX

```bash
npm run extension:package
```

Then **Extensions → Install from VSIX…**

## Primary Side Bar

The extension contributes an Activity Bar icon. The **Configuration** view includes:

- Enable/disable switch (same `cursorSupervisor.enabled` setting; disabling while Telegram is running shows the stop confirmation)
- Masked Telegram bot token and Cursor API key fields (saved to `.cursor-supervisor/config.json`, never shown in the webview)
- Start / Stop

## Commands

| Command | Action |
| --- | --- |
| **Cursor Supervisor: Start** | Start the service (detached by default). Blocked when `cursorSupervisor.enabled` is off. |
| **Cursor Supervisor: Stop** | Send `SIGTERM` via `cursor-supervisor stop` |
| **Cursor Supervisor: Show Status** | Show PID, start time, config path |
| **Cursor Supervisor: Set Telegram Bot Token** | Masked prompt; writes `telegram.botToken` in `.cursor-supervisor/config.json` (empty keeps the current value) |
| **Cursor Supervisor: Set Cursor API Key** | Masked prompt; writes `cursor.apiKey` in `.cursor-supervisor/config.json` (empty keeps the current value) |

## Settings

Open **Settings** and search for **Cursor Supervisor**.

| Setting | Default | Description |
| --- | --- | --- |
| `cursorSupervisor.enabled` | `true` | Master switch. When off, Start and autoStart are blocked. Turning it off while the Telegram service is running shows a modal: **Stop and disable** or **Cancel** (Cancel restores enabled). |
| `cursorSupervisor.autoStart` | `false` | Start when the workspace opens (if enabled, config exists, and the service is not running) |
| `cursorSupervisor.configPath` | `${workspaceFolder}/.cursor-supervisor/config.json` | Config passed to the CLI. Legacy workspace-root `config.json` is still detected if present. |
| `cursorSupervisor.nodePath` | `node` | Node executable |
| `cursorSupervisor.executablePath` | `""` | Override binary (auto-detect if empty) |
| `cursorSupervisor.detach` | `true` | Subprocess survives IDE close |
| `cursorSupervisor.statusPollIntervalMs` | `5000` | Status bar refresh interval |

API keys are **not** stored in Cursor Settings (`settings.json`). They stay in `.cursor-supervisor/config.json` so the CLI can read them without putting secrets in the Settings UI.

### Executable resolution order

1. `cursorSupervisor.executablePath`
2. Bundled `{extensionPath}/server/bin/cursor-supervisor.js`
3. Workspace `node_modules` / `dist` (this repo)
4. `cursor-supervisor` on PATH

Working directory is always the **user workspace** so `.cursor-supervisor/config.json` and `data/` stay in the project.

## Single instance

CLI and IDE share `{dataDir}/service.json`:

- **Use existing instance**
- **Stop and restart**
- **Cancel**

Stale locks are cleared on the next start.

```bash
npm start
node dist/bin/cursor-supervisor.js status --json
node dist/bin/cursor-supervisor.js stop
```

Publishing: [MARKETPLACE.md](./MARKETPLACE.md).
