---
name: "08 Tests Docs Cutover"
overview: Remover SDK, docs, gate v0.2.0.
todos:
  - id: remove-sdk
    content: npm remove @cursor/sdk, delete cursorSdkRuntime.ts
    status: pending
  - id: docs
    content: INSTALL PREREQUISITES FAQ DEPLOYMENT README
    status: pending
  - id: smoke
    content: acp_smoke.ts + acp-e2e.md
    status: pending
  - id: gate
    content: npm test typecheck lint build v0.2.0
    status: pending
---

# Plano 08 — Cutover final

## Gate
```bash
npm test && npm run typecheck && npm run lint && npm run build
```

## Remover
- `@cursor/sdk` dependency
- `cursorSdkRuntime.ts`
- `tests/manual/sdk_smoke.ts`

## Version
0.2.0 (breaking)
