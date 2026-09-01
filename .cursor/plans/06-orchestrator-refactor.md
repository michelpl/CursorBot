---
name: "06 Orchestrator Refactor"
overview: AgentOrchestrator bidirecional + busyPolicy.
todos:
  - id: busy-policy
    content: running+pending roteia resposta
    status: pending
  - id: orchestrator
    content: interaction handler loop
    status: pending
  - id: wiring
    content: cursorbot.ts AcpRuntime + store
    status: pending
  - id: tests
    content: orchestrator.test.ts permission flows
    status: pending
---

# Plano 06 — Orchestrator refactor

## Arquivos
- `src/core/orchestrator/AgentOrchestrator.ts`
- `src/core/orchestrator/busyPolicy.ts`
- `src/bin/cursorbot.ts`

## Busy policy
- running + pending → route as response
- running + no pending → reject
- ! prefix → force-replace
