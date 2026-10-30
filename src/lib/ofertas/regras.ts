// ============================================================================
// Ofertas dos planos dentro do app (pedido do Montinho, 30/10/2026). Regras
// PURAS. Só convite para o WhatsApp do Montinho (sem pagamento no app).
//  • Visitante: Consultoria online e, para quem pode ir a Alphaville, o
//    Pacote Flexível. Aluno da consultoria: o Pacote Flexível (se pode ir).
//  • O personal liga/desliga cada oferta e escreve uma vantagem opcional.
//  • Limite: visitante vê no máximo 1 oferta por dia; aluno, 1 por semana.
//    “Agora não” some por 7 dias (aluno 14); tocou no WhatsApp, 14 dias.
//  • Nunca com dor/desconforto recente nem no meio do treino.
// ============================================================================
import type { OfertaConfig, OfertaConfigId } from "@/lib/supabase/types-extended";

export type OfertaId = "consultoria" | "pacote";
export type Publico = "visitante" | "aluno";

export type Oferta = { id: OfertaId; config: OfertaConfigId; promo: string | null };

export const LIMITES_OFERTA = {
  /** Intervalo mínimo entre duas ofertas mostradas (qualquer lugar). */
  intervaloHoras: { visitante: 20, aluno: 24 * 7 },
  dispensaDias: { visitante: 7, aluno: 14 },
  cliqueDias: 14,
} as const;

/** As ofertas que valem para a pessoa, na ordem em que devem aparecer. */
export function ofertasPara(e: { publico: Publico; podePresencial: boolean; config: Array<Pick<OfertaConfig, "id" | "ativo" | "promo">> }): Oferta[] {
  const cfg = new Map(e.config.map((c) => [c.id, c]));
  const ligada = (id: OfertaConfigId) => cfg.get(id)?.ativo !== false;
  const promo = (id: OfertaConfigId) => cfg.get(id)?.promo?.trim() || null;
  const out: Oferta[] = [];
  if (e.publico === "visitante") {
    if (ligada("consultoria_visitantes")) out.push({ id: "consultoria", config: "consultoria_visitantes", promo: promo("consultoria_visitantes") });
    if (e.podePresencial && ligada("pacote_visitantes")) out.push({ id: "pacote", config: "pacote_visitantes", promo: promo("pacote_visitantes") });
  } else if (e.podePresencial && ligada("pacote_alunos")) {
    out.push({ id: "pacote", config: "pacote_alunos", promo: promo("pacote_alunos") });
  }
  return out;
}

/** O que o aparelho lembra (localStorage): quando mostrou, dispensou ou tocou. */
export type HistoricoOferta = { ultimaVista?: number; dispensada?: Partial<Record<OfertaId, number>>; clicada?: Partial<Record<OfertaId, number>> };

const H = 3_600_000;
const D = 24 * H;

/**
 * A oferta a mostrar agora (ou null). Respeita o intervalo entre ofertas, as
 * pausas de “agora não” e do clique, e alterna entre as ofertas pelo dia.
 * `jaNestaTela` = a mesma oferta já está sendo mostrada (não conta de novo).
 */
export function escolherOferta(e: { ofertas: Oferta[]; publico: Publico; agora: number; historico: HistoricoOferta; dor: boolean; diaDoAno: number }): Oferta | null {
  if (e.dor || !e.ofertas.length) return null;
  const h = e.historico;
  if (h.ultimaVista && e.agora - h.ultimaVista < LIMITES_OFERTA.intervaloHoras[e.publico] * H) return null;
  const livres = e.ofertas.filter((o) => {
    const d = h.dispensada?.[o.id];
    const c = h.clicada?.[o.id];
    return !(d && e.agora - d < LIMITES_OFERTA.dispensaDias[e.publico] * D) && !(c && e.agora - c < LIMITES_OFERTA.cliqueDias * D);
  });
  if (!livres.length) return null;
  return livres[e.diaDoAno % livres.length];
}

/** Texto do cartão, com os números da própria pessoa quando houver. */
export function textoDaOferta(o: Oferta, e: { publico: Publico; nome: string; treinos: number }): { titulo: string; texto: string; botao: string } {
  const nome = e.nome.split(" ")[0];
  const feitos = e.treinos >= 2 ? `${e.treinos} treinos` : null;
  if (o.id === "consultoria") {
    return {
      titulo: feitos ? `${nome}, ${feitos} por conta própria. Bora com acompanhamento?` : `${nome}, que tal treinar com o Montinho?`,
      texto: "Na consultoria eu monto o seu treino, acompanho cada semana e ajusto quando a carga trava ou a rotina muda. Tudo pelo app e pelo WhatsApp.",
      botao: "💬 Quero saber como funciona",
    };
  }
  return {
    titulo: e.publico === "aluno" ? `${nome}, já pensou em umas aulas comigo?` : `${nome}, 5 meses de consultoria + 10 aulas comigo`,
    texto: e.publico === "aluno" ? "No Pacote Flexível você continua com a consultoria e ganha 10 aulas presenciais para usar quando der, sem horário fixo. Uma aula afina a técnica e destrava a carga." : "Consultoria online + 10 aulas presenciais em Alphaville, para usar quando der, sem horário fixo. Dá para parcelar.",
    botao: "💬 Quero o Pacote Flexível",
  };
}
