// ============================================================================
// Sugestão de pesos dos músculos secundários (volume ponderado) a partir da
// própria biblioteca: exercícios com o mesmo padrão de movimento e o mesmo
// músculo principal. É ponto de partida para o treinador ajustar, não verdade.
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { ItemBiblioteca, PadraoMovimento } from "./tipos";

export type SugestaoPesos = {
  pesos: Partial<Record<GrupoMuscular, number>>;
  /** Quantos exercícios da biblioteca serviram de base. */
  baseadoEm: number;
  /** "padrao_grupo" = mesmo padrão e músculo; "padrao" = só mesmo padrão; null = sem base. */
  criterio: "padrao_grupo" | "padrao" | null;
};

const arredondarQuarto = (n: number) => Math.round(n * 4) / 4;

function mediana(xs: number[]): number {
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/**
 * Músculos que aparecem como secundários em pelo menos metade dos exercícios
 * parecidos, com a mediana dos pesos (arredondada a 0,25). Nunca inclui o
 * músculo principal. `ignorarId` tira o próprio exercício da base.
 */
export function sugerirPesosSecundarios(
  grupo: GrupoMuscular | null | undefined,
  padrao: PadraoMovimento | null | undefined,
  itens: ItemBiblioteca[],
  ignorarId?: string | null
): SugestaoPesos {
  if (!padrao) return { pesos: {}, baseadoEm: 0, criterio: null };
  const base = itens.filter((i) => i.id !== ignorarId && i.padrao === padrao);
  const mesmoGrupo = grupo ? base.filter((i) => i.grupo === grupo) : [];
  const [amostra, criterio] = mesmoGrupo.length ? [mesmoGrupo, "padrao_grupo" as const] : [base, "padrao" as const];
  if (!amostra.length) return { pesos: {}, baseadoEm: 0, criterio: null };

  const valores = new Map<GrupoMuscular, number[]>();
  for (const i of amostra)
    for (const [g, w] of Object.entries(i.pesosSecundarios) as Array<[GrupoMuscular, number]>)
      if (w > 0 && g !== grupo) valores.set(g, [...(valores.get(g) ?? []), w]);

  const pesos: Partial<Record<GrupoMuscular, number>> = {};
  for (const [g, ws] of valores) {
    if (ws.length * 2 < amostra.length) continue; // aparece em menos da metade: não sugere
    const w = arredondarQuarto(mediana(ws));
    if (w > 0) pesos[g] = Math.min(1, w);
  }
  return { pesos, baseadoEm: amostra.length, criterio };
}
