// ============================================================================
// Leads: com quem falar agora (pedido do Montinho, 29/10/2026) — regra PURA.
// Ordem de prioridade (um motivo por pessoa, o mais forte):
//   1. Tocou no WhatsApp e ainda está “Novo” (quer conversar e ninguém respondeu);
//   2. Acesso terminando em até 5 dias (ou terminou há até 7) sem virar aluno;
//   3. Já fez 3+ treinos e ainda está “Novo” (engajado: bom momento de convite);
//   4. Entrou há 3+ dias e não fez nenhum treino (precisa de um empurrão).
// Quem virou aluno ou está “Sem interesse” nunca entra.
// ============================================================================
import type { Lead } from "./leads";

export type MotivoContato = "pediu" | "terminando" | "engajado" | "parado";
export type Contato = { lead: Lead; motivo: MotivoContato; texto: string; mensagem: string };

const DIA = 86_400_000;
const primeiro = (nome: string) => nome.split(" ")[0] || nome;

export const ROTULO_MOTIVO: Record<MotivoContato, { emoji: string; titulo: string }> = {
  pediu: { emoji: "💬", titulo: "Pediu para falar com você" },
  terminando: { emoji: "⏳", titulo: "Acesso terminando" },
  engajado: { emoji: "🔥", titulo: "Treinando bem" },
  parado: { emoji: "😴", titulo: "Ainda não treinou" },
};

export function comQuemFalar(leads: Lead[], agora: Date = new Date()): Contato[] {
  const t = agora.getTime();
  const out: Contato[] = [];
  for (const l of leads) {
    if (l.convertido || l.status === "virou_aluno" || l.status === "sem_interesse") continue;
    const nome = primeiro(l.nome);
    const fim = l.acessoFim ? Date.parse(l.acessoFim) : null;
    const diasFim = fim !== null ? Math.ceil((fim - t) / DIA) : null;
    if (l.whatsapp && l.status === "novo") {
      out.push({ lead: l, motivo: "pediu", texto: `Tocou no WhatsApp (${l.whatsapp.ref}) e ainda não teve resposta.`, mensagem: `Oi, ${nome}! Vi que você me chamou pelo app. Como posso te ajudar?` });
    } else if (diasFim !== null && diasFim <= 5 && diasFim >= -7) {
      out.push({ lead: l, motivo: "terminando", texto: diasFim > 0 ? `O acesso termina em ${diasFim} ${diasFim === 1 ? "dia" : "dias"}.` : diasFim === 0 ? "O acesso termina hoje." : `O acesso terminou há ${-diasFim} ${-diasFim === 1 ? "dia" : "dias"}.`, mensagem: `Oi, ${nome}! Seus dias com o app ${diasFim >= 0 ? "estão acabando" : "acabaram"}. Você fez ${l.treinosFeitos} ${l.treinosFeitos === 1 ? "treino" : "treinos"} — quer continuar com acompanhamento? Te explico como funciona.` });
    } else if (l.treinosFeitos >= 3 && l.status === "novo") {
      out.push({ lead: l, motivo: "engajado", texto: `Já fez ${l.treinosFeitos} treinos e ninguém conversou ainda.`, mensagem: `Oi, ${nome}! Vi que você já fez ${l.treinosFeitos} treinos no app. Mandou bem! Como está sendo?` });
    } else if (l.treinosFeitos === 0 && t - Date.parse(l.cadastroEm) >= 3 * DIA && l.status === "novo") {
      out.push({ lead: l, motivo: "parado", texto: `Entrou há ${Math.floor((t - Date.parse(l.cadastroEm)) / DIA)} dias e ainda não fez nenhum treino.`, mensagem: `Oi, ${nome}! Tudo bem? Vi que você ainda não começou os treinos no app. Quer ajuda para montar o primeiro?` });
    }
  }
  const peso: Record<MotivoContato, number> = { pediu: 0, terminando: 1, engajado: 2, parado: 3 };
  return out.sort((a, b) => peso[a.motivo] - peso[b.motivo] || a.lead.nome.localeCompare(b.lead.nome, "pt-BR"));
}
