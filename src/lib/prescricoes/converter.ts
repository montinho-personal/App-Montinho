// Plano salvo → entrada do salvarPlano (mesmo formato do montador), para
// regravar o plano por cima mantendo os IDs (nada é apagado; versão nova).
import type { ExercicioInput, PlanoAtivo, ProgramaInput, TreinoInput } from "@/lib/data/programas";
import type { TreinoLetra } from "@/lib/supabase/types-sessoes";

type TreinoSalvo = PlanoAtivo["treinos"][number];

export function paraTreinoInput(t: TreinoSalvo, ativo = t.ativo): TreinoInput {
  return {
    id: t.id,
    letra: t.letra as TreinoLetra,
    nome: t.nome,
    ativo,
    observacoes: t.observacoes,
    // Mantém os tempos do treino (sem isto o salvarPlano zera duração, tempo-alvo e descansos).
    duracao_estimada_min: t.duracao_estimada_min ?? null,
    tempo_alvo_min: t.tempo_alvo_min ?? null,
    tempos: (t.tempos ?? {}) as Record<string, number | boolean>,
    ...(t.tempos_efetivos ? { tempos_efetivos: t.tempos_efetivos as Record<string, number | boolean> } : {}),
    exercicios: t.exercicios.map(
      (e): ExercicioInput => ({
        id: e.id, nome: e.nome, series: e.series, reps: e.reps, ie: e.ie, rir: e.rir, descanso_seg: e.descanso_seg, observacoes: e.observacoes,
        grupo_muscular: e.grupo_muscular, grupos_secundarios: e.grupos_secundarios, grupo_origem: e.grupo_origem, grupo_confianca: e.grupo_confianca,
        series_aquecimento: e.series_aquecimento, tecnica: e.tecnica, tecnica_extras: e.tecnica_extras ?? null, tecnica_series: e.tecnica_series ?? null,
        tecnica_config: e.tecnica_config ?? null, descanso_apos_seg: e.descanso_apos_seg ?? null, cadencia: e.cadencia ?? null, prioridade: e.prioridade ?? "normal",
        bloco: e.bloco, unilateral: e.unilateral, carga_alvo: e.carga_alvo, conta_volume: e.conta_volume, series_config: e.series_config, biblioteca_id: e.biblioteca_id,
      })
    ),
  };
}

export function paraProgramaInput(p: NonNullable<PlanoAtivo["programa"]>): ProgramaInput {
  return {
    nome: p.nome, objetivo: p.objetivo, nivel: p.nivel, split: p.split, modo_semana: p.modo_semana, frequencia: p.frequencia, calendario: p.calendario,
    metas_volume: p.metas_volume, prioridades: p.prioridades, equipamentos: p.equipamentos, duracao_min: p.duracao_min,
    permite_versao_reduzida: p.permite_versao_reduzida, observacoes: p.observacoes, fase: p.fase ?? null,
  };
}
