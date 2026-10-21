// Converte exercícios prescritos (banco/snapshot da sessão) para o cálculo de tempo
// e expõe o descanso efetivo de cada série durante a execução.

import type { ExercicioPrescrito } from "@/lib/supabase/types-sessoes";
import type { SerieConfig } from "@/lib/series";
import { estimarDuracao, mesclarParametros, type ExercicioTempo, type ParametrosTempo, type ResultadoTempo } from "./estimar";

type PrescricaoLike = Pick<ExercicioPrescrito, "id" | "nome" | "series" | "reps" | "descanso_seg" | "series_aquecimento" | "tecnica" | "bloco" | "unilateral"> &
  Partial<Pick<ExercicioPrescrito, "series_config" | "tecnica_extras" | "tecnica_series" | "tecnica_config" | "descanso_apos_seg" | "cadencia">>;

/** Todas as séries (aquecimento primeiro) com reps e descanso próprio (null = padrão). */
export function seriesDaPrescricao(e: PrescricaoLike): Array<{ reps: string; descansoSeg: number | null }> {
  const cfg = (e.series_config ?? null) as SerieConfig | null;
  if (cfg?.modo === "detalhado" && Array.isArray(cfg.series) && cfg.series.length) return cfg.series.map((s) => ({ reps: s.reps ?? e.reps, descansoSeg: s.descanso_seg ?? null }));
  const n = Math.max(0, cfg?.modo === "iguais" ? cfg.series : e.series);
  const reps = cfg?.modo === "iguais" ? cfg.reps : e.reps;
  const descanso = cfg?.modo === "iguais" ? cfg.descanso_seg : e.descanso_seg;
  return Array.from({ length: n }, () => ({ reps: reps ?? "", descansoSeg: descanso ?? null }));
}

export function exercicioTempoDaPrescricao(e: PrescricaoLike): ExercicioTempo {
  const todas = seriesDaPrescricao(e);
  const aquec = Math.min(Math.max(0, e.series_aquecimento ?? 0), todas.length);
  return {
    id: e.id,
    nome: e.nome,
    series: todas.slice(aquec),
    aquecimento: aquec,
    cadencia: e.cadencia ?? null,
    tecnica: e.tecnica ?? null,
    tecnicaExtras: e.tecnica_extras ?? null,
    tecnicaSeries: e.tecnica_series ?? null,
    tecnicaConfig: e.tecnica_config ?? null,
    bloco: e.bloco ?? null,
    unilateral: !!e.unilateral,
    descansoAposSeg: e.descanso_apos_seg ?? null,
  };
}

export function estimarPrescricao(exercicios: PrescricaoLike[], tempos?: Partial<ParametrosTempo> | null): ResultadoTempo {
  return estimarDuracao(exercicios.map(exercicioTempoDaPrescricao), mesclarParametros(tempos ?? {}));
}

/**
 * Descanso a cronometrar depois da série `serie` (1-based, contando aquecimento).
 * Última série: descanso após o exercício, exceto no último exercício (null).
 */
export function descansoAposSerie(e: PrescricaoLike, serie: number, ultimoExercicio: boolean, tempos?: Partial<ParametrosTempo> | null): number | null {
  const p = mesclarParametros(tempos ?? {});
  const todas = seriesDaPrescricao(e);
  const aquec = Math.min(Math.max(0, e.series_aquecimento ?? 0), todas.length);
  if (serie <= aquec) return p.descansoAquecimentoSeg;
  if (serie < todas.length) return todas[serie - 1]?.descansoSeg ?? p.descansoEntreSeriesSeg;
  if (ultimoExercicio) return null;
  return e.descanso_apos_seg ?? p.descansoAposExercicioSeg;
}
