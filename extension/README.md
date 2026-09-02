# Cursor Supervisor

Drive Cursor agents on your local repos from Telegram. This extension starts, stops, and monitors the **full Telegram ↔ Cursor ACP service** on your machine.

## Requirements

- **Node.js ≥ 20.10** on your PATH
- Cursor **agent CLI** (`agent`) available for ACP
- A Telegram bot token, your numeric Telegram user ID, and a Cursor API key

Tokens stay in a local `config.json`. They are not uploaded with the extension.

## Usage

1. Open a project folder in Cursor.
2. Command Palette → **Cursor Supervisor: Start**
3. If `config.json` is missing, complete the setup wizard.
4. Message your bot on Telegram (`/start`).

Commands: **Start**, **Stop**, **Show Status**. Click the status bar item for a summary.

By default the service is **detached** and keeps running after you close the IDE. Use **Stop** to terminate it.

## Settings

| Setting | Default |
| --- | --- |
| `cursorSupervisor.autoStart` | `false` |
| `cursorSupervisor.configPath` | `${workspaceFolder}/config.json` |
| `cursorSupervisor.nodePath` | `node` |
| `cursorSupervisor.executablePath` | empty (auto: bundled server) |
| `cursorSupervisor.detach` | `true` |
| `cursorSupervisor.statusPollIntervalMs` | `5000` |

## Privacy

Bot token, API key, and chat data stay on this computer. See the repository README for security notes.

## License

MIT
