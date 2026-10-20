// Resumo de um treino para o cartão do plano (PURO): séries válidas e os
// grupos que mais recebem séries diretas.
import type { GrupoMuscular } from "@/lib/supabase/types-extended";

type Ex = { series: number; series_aquecimento?: number | null; grupo_muscular: GrupoMuscular | null; conta_volume?: boolean | null };

export const seriesValidasDe = (e: Ex) => (e.conta_volume === false ? 0 : Math.max(0, e.series - (e.series_aquecimento ?? 0)));

export function resumoDoTreino(exercicios: Ex[], maxGrupos = 3): { validas: number; grupos: Array<{ grupo: GrupoMuscular; series: number }> } {
  const porGrupo = new Map<GrupoMuscular, number>();
  let validas = 0;
  for (const e of exercicios) {
    const n = seriesValidasDe(e);
    validas += n;
    if (n && e.grupo_muscular && e.grupo_muscular !== "nao_classificado") porGrupo.set(e.grupo_muscular, (porGrupo.get(e.grupo_muscular) ?? 0) + n);
  }
  const grupos = [...porGrupo.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxGrupos).map(([grupo, series]) => ({ grupo, series }));
  return { validas, grupos };
}
