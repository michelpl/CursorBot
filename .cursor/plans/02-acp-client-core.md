---
name: "02 ACP Client Core"
overview: Cliente JSON-RPC stdio para agent acp.
todos:
  - id: acp-process
    content: AcpProcess spawn stdin/stdout
    status: pending
  - id: json-rpc
    content: JsonRpcClient request/response/respond
    status: pending
  - id: acp-session
    content: AcpSession initialize auth session prompt
    status: pending
  - id: tests
    content: AcpClient.test.ts mock stdio fixture
    status: pending
---

# Plano 02 — ACP client core

## Novos arquivos `src/adapters/acp/`
- `acpTypes.ts`, `AcpProcess.ts`, `JsonRpcClient.ts`, `AcpSession.ts`
- `tests/unit/acpClient.test.ts`

## Referência
https://cursor.com/docs/cli/acp
