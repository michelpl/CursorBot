---
name: "00 Fork Cleanup"
overview: Remover vestígios do fork e padronizar identidade CursorBot (PT-BR).
todos:
  - id: metadata
    content: Atualizar package.json, LICENSE, README, docs
    status: pending
  - id: strings
    content: Substituir placeholders "text" por português em src/
    status: pending
  - id: defaults
    content: timezone America/Sao_Paulo, config.example.json
    status: pending
---

# Plano 00 — Fork cleanup

## Objetivo
Remover vestígios do projeto original; padronizar **CursorBot**.

## Tarefas
1. `package.json`: author Michel Lima; keywords sem wechat; cursor-acp
2. `LICENSE`: copyright Michel Lima
3. `README.md` + `docs/*`: remover superpowers/WeChat; arquitetura ACP
4. `CHANGELOG.md`: seção [Unreleased] migração ACP
5. Substituir strings `"text"` user-facing por PT em `src/`
6. `config.example.json`: timezone `America/Sao_Paulo`

## Done
- Sem Jem Li, michelpl/CursorBot (exceto CHANGELOG histórico)
- Zero `"text"` como string user-facing
- Docs sem links 404
