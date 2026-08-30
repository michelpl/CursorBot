# M2 e2e smoke text

> text / text136 tests, 24 files text
> text**text Telegram bot + text Cursor API key text**text
> textreminders text
>
> text `git status` text `npm test -- --run` text + text
>
> text `docs/superpowers/specs/2026-05-05-cursorbot-design.md` text 7 text

## text

1. text `config.json`text
   - `telegram.botToken`
   - `telegram.allowedUserIds`text Telegram userIdtext
   - `cursor.apiKey`
2. text active workspace text shelltext
   ```bash
   npm install
   npm run build
   npm link            # text PATH text cursorbot-attach-image / cursorbot-attach-file
   ```
3. text active workspace text git textagent text

## Step 1text text

```bash
npm test -- --run && npm run typecheck && npm run lint && npm run build
```

text

- [x] 136 tests text
- [x] typecheck / lint text
- [x] `dist/bin/cursorbot.js`text`dist/tools/attach-image.js`text`dist/tools/attach-file.js` text `#!/usr/bin/env node` shebang

## Step 2text dev

```bash
npx tsx src/bin/cursorbot.ts
```

text startup logtext

- [ ] `cursorbot started` text
- [ ] text grammy 409text
- [ ] active workspace text `.cursorbot/data-dir.txt` text `paths.dataDir`

## Step 3text9 text

### A text

- [ ] **A1 text**text Telegram text caption "text" text bottextagent text
- [ ] **A2 album text**text Telegram text 3 text albumtextserver text `incoming imageGroup` textn: 3textagent text prompt text 3 text

### B text

- [ ] **B1 text**text agent text shell text
  ```bash
  echo test > /tmp/clawtest.txt && cursorbot-attach-file /tmp/clawtest.txt --caption "test"
  ```
  run text Telegram text
- [ ] **B2 text + text**text agent text run text 2 text`cursorbot-attach-image`text`<dataDir>/queue.jsonl` text

### C Reminders

- [ ] **C1 reminders text**text`/remind add text 10s text`text10 text "text text"text`<dataDir>/reminders.json` text
- [ ] **C2 reminders prompt**text`/remind add prompt 10s text`text10 text agent text
- [ ] **C3 reminders busy text**text `/remind add prompt 5s text`text `!text 200 text agent text`text prompttextscheduler text busy text text "text text 1 text" text60s text agent text "text text..." text
- [ ] **C4 list / del**text`/remind add text 1h text`text`/remind list` text idtext`/remind del <id>`text list text

## Step 4text git text

```bash
git status   # text nothing to commit
```

## Step 5textM2 text commit

```bash
git commit --allow-empty -m "chore(m2): e2e smoke text 9 text"
```
