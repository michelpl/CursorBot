# Publishing to the Cursor marketplace

Cursor installs third-party extensions from **[Open VSX](https://open-vsx.org/)**, then syncs them through `marketplace.cursorapi.com` (malware/supply-chain scan). It does **not** use the Microsoft VS Code Marketplace.

This repo is **prepared** for publish. It does not run `ovsx publish` for you.

## Package locally

```bash
npm install
npm run extension:package
```

This builds the Telegram service, copies it to `extension/server/`, builds the extension host bundle, and writes a `.vsix` under `extension/`.

Confirm the archive contains `server/bin/cursor-supervisor.js`.

Extension ID: **`michelpl.cursor-supervisor`**

- Publisher: `michelpl` (create/claim on Open VSX)
- `engines.vscode`: `^1.85.0` (keep this at or below the VS Code version Cursor reports under Help → About)

## Publish later

1. Create an Open VSX account and personal access token.
2. From `extension/` (or with the VSIX path):

   ```bash
   npx ovsx publish --pat "$OVSX_PAT"
   ```

3. Wait for Cursor’s index (often minutes to a few hours). Search for `michelpl.cursor-supervisor`. If nothing appears, reload the window.

## Optional verification badge

Cursor’s publisher verification requires a **public website** that links to the Open VSX listing (a GitHub README is not enough), plus a forum post. See [Cursor extension help](https://cursor.com/help/customization/extensions).
