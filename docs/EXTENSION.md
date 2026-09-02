# Cursor Supervisor — IDE extension

Run the Telegram ↔ Cursor ACP bridge from Cursor without keeping a terminal open. Marketplace installs **bundle** the Node service (`server/bin/cursor-supervisor.js`). Developers can still spawn a locally built CLI from this repo.

## Prerequisites

1. Node.js **>= 20.10** on PATH (or set `cursorSupervisor.nodePath`).
2. Cursor agent CLI for ACP.
3. `config.json` in the workspace, or complete the first-run wizard.

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
4. **Cursor Supervisor: Start**

### VSIX

```bash
npm run extension:package
```

Then **Extensions → Install from VSIX…**

## Commands

| Command | Action |
| --- | --- |
| **Cursor Supervisor: Start** | Start the service (detached by default) |
| **Cursor Supervisor: Stop** | Send `SIGTERM` via `cursor-supervisor stop` |
| **Cursor Supervisor: Show Status** | Show PID, start time, config path |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `cursorSupervisor.autoStart` | `false` | Start when the workspace opens (if `config.json` exists) |
| `cursorSupervisor.configPath` | `${workspaceFolder}/config.json` | Config passed to the CLI |
| `cursorSupervisor.nodePath` | `node` | Node executable |
| `cursorSupervisor.executablePath` | `""` | Override binary (auto-detect if empty) |
| `cursorSupervisor.detach` | `true` | Subprocess survives IDE close |
| `cursorSupervisor.statusPollIntervalMs` | `5000` | Status bar refresh interval |

### Executable resolution order

1. `cursorSupervisor.executablePath`
2. Bundled `{extensionPath}/server/bin/cursor-supervisor.js`
3. Workspace `node_modules` / `dist` (this repo)
4. `cursor-supervisor` on PATH

Working directory is always the **user workspace** so `config.json` and `data/` stay in the project.

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
