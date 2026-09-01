import type { CommandContext } from "../dispatch.js";

const HELP_TEXT = `<b>cursorbot</b> — Cursor via Telegram (ACP)

<code>/start</code> ou <code>/help</code> — esta ajuda
<code>/ws list</code> — listar workspaces
<code>/ws use &lt;nome&gt;</code> — trocar workspace ativo
<code>/ws add &lt;nome&gt; &lt;caminho-abs&gt;</code> — adicionar workspace
<code>/ws remove &lt;nome&gt;</code> — remover workspace
<code>/ws path</code> — caminho do workspace ativo
<code>/reset</code> — reiniciar sessão ACP
<code>/cancel</code> — cancelar execução em andamento
<code>/status</code> — workspace, sessão, modo e plano pendente
<code>/model &lt;id&gt;</code> — (no-op com ACP; modelo definido no Cursor CLI)

<b>Modos ACP</b>
<code>/plan &lt;tarefa&gt;</code> — elaborar plano (modo plan)
<code>/agent</code> — ativar modo agent
<code>/agent &lt;prompt&gt;</code> — executar no modo agent
<code>/ask &lt;pergunta&gt;</code> — modo ask (read-only)
Texto livre sem prefixo de modo: o Cursor decide o modo da sessão.

<b>Fluxo plan → executar</b>
1. <code>/plan corrigir o teste X</code>
2. Aprovar e guardar o plano nos botões
3. <code>/agent</code> e depois <code>/agent executar o plano</code>

<b>Lembretes</b>
<code>/remind add text &lt;quando&gt; &lt;texto&gt;</code> — mensagem simples
<code>/remind add prompt &lt;quando&gt; &lt;prompt&gt;</code> — prompt ao agente
<code>/remind list</code>
<code>/remind del &lt;id&gt;</code>
Formatos: 10m, 1h30m | HH:MM | YYYY-MM-DDTHH:MM

<b>Anexos</b> — via shell tool do agente:
<code>cursorbot-attach-image /caminho/x.png [--caption "..."]</code>
<code>cursorbot-attach-file  /caminho/x.pdf [--caption "..."]</code>
Enviados ao Telegram após a execução.

<b>Imagens</b> — envie foto ou álbum; o agente analisa com prompt padrão ou legenda.

Prefixe com <code>!</code> para forçar nova execução (cancela a atual).`;

export async function handleHelp(ctx: CommandContext): Promise<void> {
  await ctx.messenger.sendText(ctx.chatId, HELP_TEXT, { parseMode: "HTML" });
}
