---
name: "05 Telegram Interactive UI"
overview: Callbacks e inline keyboards para ACP.
todos:
  - id: imessenger
    content: Estender IMessenger callback_query + sendInteractive
    status: pending
  - id: telegram
    content: TelegramMessenger inline keyboards
    status: pending
  - id: render
    content: permission/question/plan templates PT
    status: pending
  - id: tests
    content: telegramMessenger.test.ts callbacks
    status: pending
---

# Plano 05 — Telegram interactive UI

## Arquivos
- `src/core/messenger/IMessenger.ts`, `types.ts`
- `src/adapters/telegram/TelegramMessenger.ts`

## UI
- Permissão: Permitir uma vez | Sempre | Negar
- Pergunta: botões por opção
- Plano: Aceitar | Rejeitar
