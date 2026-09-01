---
name: "01 Runtime Abstractions"
overview: Evoluir runtime.ts, SessionStore e config para ACP bidirecional.
todos:
  - id: runtime-types
    content: RuntimeStreamEvent interativos + RuntimeRun.respond()
    status: pending
  - id: session-store
    content: SessionEntry.sessionId substitui agentId
    status: pending
  - id: config-schema
    content: cursor.agentCliPath, acpMode, interactionTimeoutMs
    status: pending
  - id: stub-agent
    content: Atualizar StubAgent para novos eventos
    status: pending
---

# Plano 01 — Runtime abstractions

## Arquivos
- `src/core/orchestrator/runtime.ts`
- `src/core/session/SessionStore.ts`
- `src/config/schema.ts`
- `tests/helpers/StubAgent.ts`

## Novos eventos
- `permission_request`, `question_request`, `plan_request`, `notification`

## Config ACP
- `cursor.agentCliPath` default `"agent"`
- `cursor.acpMode`: agent | plan | ask
- `cursor.interactionTimeoutMs`: 300000
- Remover sandboxOptions, settingSources, defaultModel (SDK)
