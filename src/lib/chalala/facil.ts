// ============================================================================
// “Vai que tá fácil!” — o bordão do DESAFIO (PURO, testado).
// Aparece ANTES da última série válida do exercício, só quando as séries de
// hoje saíram fáceis: todas no topo da faixa prescrita (ou no tempo-alvo) e,
// se o aluno marcou RIR, sobrando pelo menos 2 repetições. É um convite com
// um número pequeno; o aluno decide. Nunca com cansaço/desconforto relatado,
// em aquecimento, em série com técnica avançada ou no treino curto.
// ============================================================================

import { segundosPrevistos } from "@/lib/treino/medida";

export const FRASE_FACIL = "Vai que tá fácil!";
export const LIMITE_FACIL = { porTreino: 2, rirMinimo: 2 } as const;

export type SerieFeita = { reps: number | null; rir: number | null; desconforto: number | null; prescrito: string | null };

export type EntradaFacil = {
  /** Séries VÁLIDAS concluídas hoje neste exercício (sem aquecimento). */
  feitas: SerieFeita[];
  /** A próxima série é a última válida do exercício? */
  proximaEhUltima: boolean;
  porTempo: boolean;
  /** Tem carga registrada (sugere kg) ou não (sugere repetições/tempo). */
  temCarga: boolean;
  checkin: string | null | undefined;
  tempoCurto: boolean;
  /** Última série com técnica avançada (drop-set, rest-pause): não soma desafio. */
  ultimaComTecnica: boolean;
  /** Personal desligou para este aluno. */
  desligado: boolean;
};

const topo = (prescrito: string | null): number | null => {
  const nums = (prescrito ?? "").match(/\d+/g)?.map(Number).filter((n) => n > 0) ?? [];
  return nums.length ? Math.max(...nums) : null;
};

/** Texto do convite, ou null quando não é hora. */
export function conviteVaiQueTaFacil(e: EntradaFacil): string | null {
  if (e.desligado || !e.proximaEhUltima || e.tempoCurto || e.ultimaComTecnica) return null;
  if (e.checkin === "cansado" || e.checkin === "desconforto") return null;
  if (!e.feitas.length) return null;
  const facil = e.feitas.every((s) => {
    if (s.reps == null || (s.desconforto ?? 0) > 0) return false;
    if (s.rir != null && s.rir < LIMITE_FACIL.rirMinimo) return false;
    const alvo = e.porTempo ? segundosPrevistos(s.prescrito) : topo(s.prescrito);
    return alvo != null && s.reps >= alvo;
  });
  if (!facil) return null;
  if (e.porTempo) return "As séries saíram no tempo certinho. Que tal segurar 5 a 10 segundos a mais nesta última?";
  return e.temCarga
    ? "As séries saíram no topo das repetições. Que tal colocar 1 a 2 kg a mais nesta última (ou fazer 1 a 2 repetições a mais)?"
    : "As séries saíram no topo das repetições. Que tal 1 a 2 repetições a mais nesta última?";
}
