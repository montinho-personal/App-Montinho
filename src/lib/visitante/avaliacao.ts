// ============================================================================
// Modo Visitante — pedido de avaliação no Google (pedido do Montinho, 29/10/2026).
// Puro (sem rede). Do jeito que os melhores apps fazem:
//  • pede na hora boa: no fim de um treino concluído (a tela do Chalalá), nunca
//    ao abrir o app nem no meio do treino;
//  • só depois de a pessoa conhecer o app: 5+ treinos concluídos e 7+ dias;
//  • nunca com dor/desconforto no treino de hoje (cuidado, não filtro);
//  • pouco e sem insistir: no máximo 2 pedidos na tela (7+ dias entre eles) e
//    1 lembrete no celular no dia seguinte ao 1º pedido, se a pessoa não respondeu;
//  • tocou em “Avaliar no Google” ou “Já avaliei” → nunca mais pede.
// Regras do Google (avaliações de usuários): o MESMO botão para todo mundo, sem
// perguntar antes “gostou?” para mandar só quem gostou (é proibido filtrar), e
// sem prêmio por avaliar (nada de troféu, desconto ou dias a mais).
// ============================================================================
import type { EventoCta } from "@/lib/visitante/ctas";

/**
 * Link “Escrever avaliação” do Perfil da Empresa no Google (Google → Perfil da
 * Empresa → “Pedir avaliações” → copiar o link, ex.: https://g.page/r/XXXX/review).
 * Vazio = pedido desligado (até o Montinho mandar o link).
 */
export const LINK_AVALIACAO_GOOGLE = "https://g.page/r/CYpLHC9loIaIECE/review";

/** Pedido do Montinho (29/10/2026): começa no 3º treino concluído; até 3 pedidos, 5 dias entre eles. */
export const REGRAS_AVALIACAO = {
  minTreinos: 3,
  minDias: 0,
  maxPedidos: 3,
  intervaloDias: 5,
} as const;

/** Códigos gravados em cta_eventos (sem dado pessoal). */
export const CTA_AVALIACAO = { pedido: "avaliacao_google", feita: "avaliacao_feita", sugestao: "avaliacao_sugestao" } as const;

export const TEXTOS_AVALIACAO = {
  titulo: "Me ajuda com 30 segundos? ⭐",
  texto: (treinos: number) => `Você já fez ${treinos} treinos com o app. Uma avaliação no Google conta como está sendo a sua experiência e ajuda mais gente a criar coragem para começar.`,
  dica: "Vale a sua opinião de verdade, do jeito que foi. Se quiser, conte o que mudou na sua rotina, na carga ou na constância.",
  botao: "⭐ Avaliar no Google",
  depois: "Agora não",
  feita: "Já avaliei",
  sugestao: "Tem algo para melhorar? Me conta no WhatsApp",
  mensagemSugestao: "Oi, Montinho! Tenho uma sugestão para o app:",
  obrigado: "Muito obrigado! Isso ajuda demais o Montinho a chegar em mais gente. 💛",
  push: { titulo: "Como está sendo treinar com o app? ⭐", corpo: "Uma avaliação no Google leva 30 segundos e ajuda muito o Montinho. Conta como foi?", url: "/aluno/avaliar" },
} as const;

export type ContextoAvaliacao = {
  /** Link do Google configurado. */
  ligado: boolean;
  /** Treinos concluídos contando o de agora. */
  treinosConcluidos: number;
  /** Início do acesso do visitante (ISO). */
  inicio: string | null;
  acessoVencido: boolean;
  /** Oferta do fim do acesso na tela (um convite por tela: a oferta vem antes). */
  temOferta: boolean;
  /** Dor/desconforto no treino de hoje. */
  dor: boolean;
  eventos: EventoCta[];
  agora?: Date;
};

const DIA = 86_400_000;
const diaSP = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/** A pessoa já respondeu de vez (abriu o Google ou disse que já avaliou). */
export function avaliacaoEncerrada(eventos: EventoCta[]): boolean {
  return eventos.some((e) => e.tipo === "clicado" && (e.cta === CTA_AVALIACAO.pedido || e.cta === CTA_AVALIACAO.feita));
}

/** Dias (Brasília) em que o pedido apareceu. */
export function diasDePedido(eventos: EventoCta[]): string[] {
  return [...new Set(eventos.filter((e) => e.cta === CTA_AVALIACAO.pedido && e.tipo === "exibido").map((e) => diaSP(Date.parse(e.created_at))))].sort();
}

/** Mostrar o pedido de avaliação agora (fim de um treino concluído)? */
export function devePedirAvaliacao(c: ContextoAvaliacao): boolean {
  const agora = (c.agora ?? new Date()).getTime();
  if (!c.ligado || c.acessoVencido || c.temOferta || c.dor) return false;
  if (c.treinosConcluidos < REGRAS_AVALIACAO.minTreinos) return false;
  if (!c.inicio || agora - Date.parse(c.inicio) < REGRAS_AVALIACAO.minDias * DIA) return false;
  if (avaliacaoEncerrada(c.eventos)) return false;
  const hoje = diaSP(agora);
  const doPedido = c.eventos.filter((e) => e.cta === CTA_AVALIACAO.pedido);
  // “Agora não” hoje: não volta hoje.
  if (doPedido.some((e) => e.tipo === "dispensado" && diaSP(Date.parse(e.created_at)) === hoje)) return false;
  const dias = diasDePedido(c.eventos);
  if (dias.includes(hoje)) return true; // o mesmo pedido de hoje (voltou à tela)
  if (dias.length >= REGRAS_AVALIACAO.maxPedidos) return false;
  const ultimo = doPedido.filter((e) => e.tipo === "exibido").reduce((m, e) => Math.max(m, Date.parse(e.created_at)), 0);
  return !ultimo || agora - ultimo >= REGRAS_AVALIACAO.intervaloDias * DIA;
}

/** Lembrete no celular: só no 1º pedido (1 por pessoa, para sempre). */
export function agendarLembreteAvaliacao(eventos: EventoCta[], agora: Date = new Date()): boolean {
  const dias = diasDePedido(eventos);
  return !avaliacaoEncerrada(eventos) && (dias.length === 0 || (dias.length === 1 && dias[0] === diaSP(agora.getTime())));
}

/** Link do WhatsApp para a sugestão (mostrado para todo mundo, junto do Google). */
export function linkSugestao(whatsapp: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(`${TEXTOS_AVALIACAO.mensagemSugestao} [APP-SUGESTAO]`)}`;
}

/** Link usado na tela: o oficial; na demonstração, uma busca de exemplo para ver a tela funcionando. */
export function linkAvaliacao(demo: boolean): string {
  return LINK_AVALIACAO_GOOGLE || (demo ? "https://www.google.com/search?q=Montinho+Personal+Trainer" : "");
}

/** Nomes no painel de leads (Convites: exibidos/tocados/dispensados). */
export const ROTULO_CTA_AVALIACAO: Record<string, string> = {
  avaliacao_google: "⭐ Pedido de avaliação no Google",
  avaliacao_feita: "⭐ “Já avaliei”",
  avaliacao_sugestao: "Sugestão no WhatsApp (pedido de avaliação)",
};
