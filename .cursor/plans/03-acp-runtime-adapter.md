---
name: "03 ACP Runtime Adapter"
overview: AcpRuntime implements IAgentRuntime.
todos:
  - id: acp-runtime
    content: Criar acpRuntime.ts
    status: pending
  - id: stream-map
    content: session/update -> RuntimeStreamEvent
    status: pending
  - id: inbound
    content: permission/question/plan -> respond()
    status: pending
  - id: integration-test
    content: Teste transcript mock
    status: pending
---

# Plano 03 — ACP runtime adapter

## Arquivo
- `src/core/orchestrator/acpRuntime.ts`

## Comportamento
- create/resume → AcpSession por workspace
- send → session/prompt
- inbound ACP → emit interactive event, await respond()
- cancel → session/cancel
