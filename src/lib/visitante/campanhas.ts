// ============================================================================
// Campanhas do Modo Visitante (pedido do Montinho, 22/10/2026). Puro.
//
// 1) “Convide um amigo e ganhe +10 dias”: aparece a partir do 4º treino
//    concluído (no início e no fim do treino). Cada amigo que CRIA A CONTA
//    pelo link pessoal (AMIGO-XXXXX) dá +10 dias, até 3 amigos (+30). O amigo
//    entra com os 30 dias normais. O bônus é aplicado pelo banco (0068).
// 2) Oferta do fim do acesso: dos 5 dias antes de acabar até 7 dias depois,
//    por faixa de dedicação (treinos concluídos × meta semanal do onboarding):
//      • alta (70%+ da meta ou 12+ treinos): 20% de desconto em qualquer
//        plano, válido por 72 h a partir da 1ª vez que aparece;
//      • média (40–70%): conversa grátis com o Montinho;
//      • baixa (<40%): pergunta o que atrapalhou.
//    Tudo leva ao WhatsApp oficial com o código de origem (APP-…).
// ============================================================================

import type { EventoCta } from "./ctas";

export const REGRAS_INDICACAO = { treinosMinimos: 4, diasPorAmigo: 10, maxDias: 30 } as const;
export const REGRAS_OFERTA = { diasAntes: 5, diasDepois: 7, horasValidade: 72, desconto: 20, pctAlta: 0.7, pctMedia: 0.4, treinosAlta: 12 } as const;

const DIA = 86_400_000;
const HORA = 3_600_000;

export type ResumoIndicacao = { amigos: number; diasGanhos: number };

/** O convite de amigo aparece? (4+ treinos e ainda não ganhou os +30 dias) */
export function conviteLiberado(treinosConcluidos: number, r: ResumoIndicacao): boolean {
  // Mesmo com os +30 dias já ganhos o convite continua: amigo que fecha dá 10% de desconto (0102).
  void r;
  return treinosConcluidos >= REGRAS_INDICACAO.treinosMinimos;
}

/** Mensagem que o visitante manda para o amigo (WhatsApp). */
export function mensagemConviteAmigo(link: string): string {
  return [
    "Olá! Tô treinando com o app do Montinho Personal Trainer e tá me ajudando muito 💪",
    "Dá para usar 30 dias de graça: você monta seus treinos com vídeo de cada exercício, anota as cargas e acompanha sua evolução.",
    `Entra pelo meu convite: ${link}`,
  ].join("\n\n");
}

export type FaixaDedicacao = "alta" | "media" | "baixa";

/** Dedicação no período: treinos concluídos ÷ (meta semanal × semanas de acesso até agora). */
export function faixaDedicacao(p: { treinosConcluidos: number; frequenciaSemanal: number | null; inicio: string; fim: string; agora: Date }): { faixa: FaixaDedicacao; pct: number } {
  const ini = Date.parse(p.inicio);
  const ate = Math.min(p.agora.getTime(), Date.parse(p.fim));
  const semanas = Math.max(1, (ate - ini) / (7 * DIA));
  const meta = Math.max(1, p.frequenciaSemanal ?? 3);
  const pct = p.treinosConcluidos / (meta * semanas);
  const faixa: FaixaDedicacao = pct >= REGRAS_OFERTA.pctAlta || p.treinosConcluidos >= REGRAS_OFERTA.treinosAlta ? "alta" : pct >= REGRAS_OFERTA.pctMedia ? "media" : "baixa";
  return { faixa, pct: Math.round(pct * 100) / 100 };
}

export type IdOferta = "oferta_desconto" | "oferta_conversa" | "oferta_feedback";
export type Oferta = { id: IdOferta; ref: string; titulo: string; texto: string; botao: string; mensagem: string; expiraEm: string | null };

const OFERTAS: Record<FaixaDedicacao, Omit<Oferta, "expiraEm">> = {
  alta: {
    id: "oferta_desconto",
    ref: "APP-OFERTA20",
    titulo: `Você mandou muito bem! Ganhou ${REGRAS_OFERTA.desconto}% de desconto`,
    texto: `Pela sua dedicação nestes dias, o Montinho liberou ${REGRAS_OFERTA.desconto}% de desconto em qualquer plano para você continuar evoluindo com treino feito para você e acompanhamento de perto.`,
    botao: `Quero meus ${REGRAS_OFERTA.desconto}% de desconto`,
    mensagem: `Olá, Montinho! Terminei meu período no app e quero aproveitar os ${REGRAS_OFERTA.desconto}% de desconto para continuar.`,
  },
  media: {
    id: "oferta_conversa",
    ref: "APP-CONVERSA",
    titulo: "Bora conversar sobre o seu próximo passo?",
    texto: "O Montinho te ajuda de graça a entender o que funcionou nestes dias e como continuar evoluindo. É só chamar.",
    botao: "Quero conversar com o Montinho",
    mensagem: "Olá, Montinho! Estou terminando meu período no app e queria conversar sobre como continuar.",
  },
  baixa: {
    id: "oferta_feedback",
    ref: "APP-FEEDBACK",
    titulo: "O que atrapalhou os seus treinos?",
    texto: "Tempo, rotina, motivação ou não saber o que fazer? Conta para o Montinho: ele te ajuda a achar um jeito que caiba na sua vida.",
    botao: "Contar para o Montinho",
    mensagem: "Olá, Montinho! Estou terminando meu período no app e queria contar o que atrapalhou meus treinos.",
  },
};

/** A oferta do fim do acesso (ou nenhuma, fora da janela ou com o desconto vencido). */
export function ofertaFimAcesso(p: { fim: string | null; inicio: string | null; treinosConcluidos: number; frequenciaSemanal: number | null; eventos: EventoCta[]; agora: Date }): Oferta | null {
  if (!p.fim || !p.inicio) return null; // acesso sem prazo: não há “fim”
  const t = p.agora.getTime();
  const fim = Date.parse(p.fim);
  if (t < fim - REGRAS_OFERTA.diasAntes * DIA || t > fim + REGRAS_OFERTA.diasDepois * DIA) return null;
  const { faixa } = faixaDedicacao({ treinosConcluidos: p.treinosConcluidos, frequenciaSemanal: p.frequenciaSemanal, inicio: p.inicio, fim: p.fim, agora: p.agora });
  const base = OFERTAS[faixa];
  if (base.id !== "oferta_desconto") return { ...base, expiraEm: null };
  // 72 h a partir da 1ª vez que o desconto apareceu.
  const primeira = p.eventos.filter((e) => e.cta === "oferta_desconto" && e.tipo === "exibido").map((e) => Date.parse(e.created_at)).sort((a, b) => a - b)[0];
  const expira = (primeira ?? t) + REGRAS_OFERTA.horasValidade * HORA;
  if (t > expira) return null;
  return { ...base, expiraEm: new Date(expira).toISOString() };
}

/** “faltam 2 dias e 5 h” / “faltam 3 h” */
export function prazoRestante(expiraEm: string, agora: Date): string {
  const ms = Math.max(0, Date.parse(expiraEm) - agora.getTime());
  const h = Math.floor(ms / HORA);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d === 1 && !(h % 24) ? "falta" : "faltam"} ${d} ${d === 1 ? "dia" : "dias"}${h % 24 ? ` e ${h % 24} h` : ""}`;
  return h >= 1 ? `${h === 1 ? "falta" : "faltam"} ${h} h` : "acaba em menos de 1 h";
}

export function linkOferta(o: Oferta, whatsapp: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(`${o.mensagem} [${o.ref}]`)}`;
}
