---
name: "04 Pending Interaction Store"
overview: Estado de interações pendentes ACP ↔ Telegram.
todos:
  - id: store
    content: PendingInteractionStore + TTL
    status: pending
  - id: router
    content: InteractionRouter prompt vs resposta
    status: pending
  - id: persist
    content: dataDir/interactions.json opcional
    status: pending
  - id: tests
    content: unit tests TTL cancel
    status: pending
---

# Plano 04 — Pending interaction store

## Novos arquivos `src/core/interactions/`
- `PendingInteractionStore.ts`, `InteractionRouter.ts`

## Regras
- Timeout → auto reject/skipped + notify user
- /cancel limpa pending + cancel ACP
