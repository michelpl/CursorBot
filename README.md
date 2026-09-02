<h1 align="center">Cursor Supervisor</h1>

<p align="center">
  <b>Telegram ↔ Cursor ACP bridge</b><br/>
  Drive Cursor agents on your local repos from your phone, with interactive approvals.
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20.10-43853d?logo=node.js&logoColor=white" alt="Node version"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-5.x-3178c6?logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://cursor.com/docs/cli/acp"><img src="https://img.shields.io/badge/Cursor-ACP-7d56f4" alt="Cursor ACP"></a>
</p>

---

## Why Cursor Supervisor

Cursor's agent lives **inside the IDE**. Cursor Supervisor is a local service that exposes those agents through Telegram via **ACP** (`agent acp`). You text the bot; it drives agents on your machine and streams answers back. Approve tool calls, answer questions, and accept plans from inline buttons.

Install the **Cursor IDE extension** from the marketplace (Open VSX) or run the CLI from this repo.

## Features

- End-to-end text conversation with throttled streaming
- Multi-workspace (`/ws use <name>`)
- Commands: `/help` `/ws` `/reset` `/cancel` `/status` `/model` `/remind`, ACP modes `/plan` `/agent` `/ask`, and `!<text>` interrupt
- Inbound photos and albums
- Outbound attachments via `cursor-supervisor-attach-image` / `cursor-supervisor-attach-file`
- Reminders (absolute, relative, or daily)
- Allow-list access control
- Single-instance lock (`data/service.json`) for CLI, systemd/pm2, and the IDE extension

## Quickstart

See **[docs/INSTALL.md](./docs/INSTALL.md)** for the full walkthrough.

```bash
git clone https://github.com/michelpl/cursor-supervisor.git
cd cursor-supervisor
npm install
cp config.example.json config.json
# Edit botToken, allowedUserIds, apiKey — or set TELEGRAM_BOT_TOKEN and CURSOR_API_KEY

npm run dev
```

Open Telegram, message your bot, type `/start`.

### Cursor IDE extension

The extension **bundles the Telegram service**. After install, open a workspace, run **Cursor Supervisor: Start**, and complete the first-run setup if `config.json` is missing.

Requirements: **Node.js ≥ 20.10** on PATH and the Cursor **agent CLI**.

Local development:

```bash
npm run build
npm run extension:build
# F5 — Run Cursor Supervisor Extension
```

Package a VSIX (does not publish):

```bash
npm run extension:package
```

See **[docs/EXTENSION.md](./docs/EXTENSION.md)** and **[docs/MARKETPLACE.md](./docs/MARKETPLACE.md)**.

## Prerequisites

| Requirement | How to get it |
| --- | --- |
| Node.js **>= 20.10** | https://nodejs.org/ |
| Telegram bot token | [@BotFather](https://t.me/BotFather) → `/newbot` |
| Your Telegram user ID | [@userinfobot](https://t.me/userinfobot) → `telegram.allowedUserIds` |
| Cursor API key | Cursor Settings or `agent login` |

Details: **[docs/PREREQUISITES.md](./docs/PREREQUISITES.md)**.

## Commands

| Command | Description |
| --- | --- |
| `/help` | Show help |
| `/ws list` / `/ws use` / `/ws add` / `/ws remove` / `/ws path` | Workspaces |
| `/reset` | Reset the ACP session |
| `/cancel` | Cancel the current run |
| `/status` | Workspace, session, mode, approved plan |
| `/model <id>` | Documented no-op (model is set in the Cursor CLI) |
| `/plan <task>` | Plan mode |
| `/agent` / `/agent <prompt>` | Agent mode (`/agent execute the plan` uses a saved plan) |
| `/ask <question>` | Ask mode (read-only) |
| `/remind …` | Reminders |
| `!<text>` | Interrupt and start a new prompt |

Attachments from the agent shell:

```bash
cursor-supervisor-attach-image /path/to/screenshot.png
cursor-supervisor-attach-file /path/to/report.pdf
```

The tools find the data directory via `<workspace>/.cursor-supervisor/data-dir.txt`, or `CURSOR_SUPERVISOR_DATA_DIR`.

Default reminder timezone is `America/Sao_Paulo` (override `reminders.timezone`).

## Architecture

| Layer | Module |
| --- | --- |
| CLI | `src/bin/cursor-supervisor.ts` (`run`, `status`, `stop`) |
| Service lock | `src/core/service/ServiceLock.ts` |
| IDE extension | `extension/` (bundles `server/` in the VSIX) |
| Telegram | `src/adapters/telegram/` |
| Orchestrator | `src/core/orchestrator/` |

## Testing

```bash
npm test
npm run typecheck
npm run lint
```

## Deployment

Long-running process: **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**.

## Security

- Do not commit `config.json` or `.cursor-supervisor/`.
- Restrict `telegram.allowedUserIds` to your own IDs.
- Run as a non-root OS user.

## License

[MIT](./LICENSE) © 2026 Michel Lima
