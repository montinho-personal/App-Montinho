// ============================================================================
// Contagem única de troféus (09/11/2026, pedido do Montinho: “precisa estar tudo
// certo”). Desde a 0152 TODO troféu conta no ranking (1 vez cada código), menos
// os da Multimodalidade. A vitrine (coleção) não lista os que se repetem e têm
// seção própria — Novo recorde pessoal, Eu voltei, Voltei a Respirar, A Volta
// por Cima, Desafio concluído —, então eles entram aqui por fora, e o número da
// sala de troféus fica IGUAL ao do ranking (a diferença só existe para quem tem
// troféu da Multimodalidade, e a tela diz quantos).
// ============================================================================
import { ORDEM, type Medalha } from "./vitrine";
import { FORA_DO_RANKING, trofeusNoRanking } from "@/lib/ranking/trofeus";

const NA_VITRINE = new Set<string>(ORDEM.map((o) => o.codigo));
const FORA = new Set<string>(FORA_DO_RANKING);

export type ContagemTrofeus = {
  /** Troféus diferentes conquistados (coleção + os de seção própria). */
  ganhos: number;
  /** Quantos dá para ter na tela agora (coleção + os de seção própria já ganhos). */
  total: number;
  /** Os que contam no ranking (= ranking_trofeus_v3). */
  noRanking: number;
  /** Ganhos que não contam no ranking (Multimodalidade). */
  foraDoRanking: number;
  /** Os de seção própria já ganhos (recorde, voltas…), 1 por código. */
  extras: number;
};

export function contagemDeTrofeus(medalhas: Medalha[], conquistas: Array<{ codigo: string }>): ContagemTrofeus {
  const naColecao = medalhas.filter((m) => m.conquistada).length;
  const extras = new Set(conquistas.map((c) => c.codigo).filter((c) => !NA_VITRINE.has(c) && !FORA.has(c) && c !== "topo_ranking")).size;
  const ganhos = naColecao + extras;
  const noRanking = trofeusNoRanking(conquistas);
  return { ganhos, total: medalhas.length + extras, noRanking, foraDoRanking: Math.max(0, ganhos - noRanking), extras };
}
