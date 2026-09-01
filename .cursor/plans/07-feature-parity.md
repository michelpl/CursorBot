---
name: "07 Feature Parity"
overview: Comandos, attachments, reminders, images com ACP.
todos:
  - id: commands
    content: /ws /reset /cancel /status /remind /help
    status: pending
  - id: images
    content: runPromptWithImages + ImageGroupBuffer
    status: pending
  - id: attachments
    content: AttachmentDispatcher + CLI tools
    status: pending
  - id: reminders
    content: ReminderScheduler prompt flow
    status: pending
  - id: rate-limit
    content: agentCreate -> sessionCreate
    status: pending
  - id: manual
    content: tests/manual/acp-e2e.md checklist
    status: pending
---

# Plano 07 — Feature parity

## Checklist
- Todos comandos funcionam
- Imagens, attachments, reminders
- promptEnvelope mantido
- StreamRenderer PT
