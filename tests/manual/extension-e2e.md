# Extension E2E Manual Checklist

Requires a built project (`npm run build`), built extension (`npm run extension:build`), and valid `config.json`.

## Setup

- [ ] Open repo in Cursor
- [ ] `npm run extension:build` succeeds
- [ ] F5 from `extension/.vscode/launch.json` opens Extension Development Host
- [ ] Open workspace folder with `config.json` in the Extension Development Host

## Start / Stop

- [ ] Command palette → **Cursor Supervisor: Start** → status bar shows `running (pid N)`
- [ ] Telegram bot responds to `/status`
- [ ] Command palette → **Cursor Supervisor: Stop** → status bar shows `stopped`
- [ ] Telegram bot no longer responds

## Conflict dialog

- [ ] Terminal: `npm start` (service running)
- [ ] IDE: **Cursor Supervisor: Start** → dialog "Cursor Supervisor is already running"
- [ ] **Use existing instance** → status bar shows running, no second process
- [ ] **Stop and restart** → old process stops, new one starts
- [ ] **Cancel** → no change

## Status bar

- [ ] Click status bar → **Show Status** message with PID
- [ ] Poll updates after external `cursor-supervisor stop` from terminal

## autoStart

- [ ] Set `cursorSupervisor.autoStart`: `true` in settings
- [ ] Reload window with service stopped → service starts automatically
- [ ] With service already running → no duplicate; status bar shows running

## Windows-specific

- [ ] Resolution via `node_modules/.bin/cursor-supervisor.cmd` works
- [ ] Detached start (`cursorSupervisor.detach: true`) survives closing Extension Development Host
- [ ] `cursor-supervisor stop` from IDE terminates detached process

## CLI standalone

- [ ] `node dist/bin/cursor-supervisor.js status --json` returns valid JSON
- [ ] Second `npm start` while running exits with clear error
- [ ] `node dist/bin/cursor-supervisor.js stop` stops running service
