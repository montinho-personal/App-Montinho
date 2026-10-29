// ============================================================================
// Copiar o protocolo de um aluno para outro (pedido do Montinho, 29/10/2026) —
// regra PURA. Copia exatamente os treinos ativos (letras, nomes, exercícios,
// séries, reps, descanso, técnicas, blocos, aquecimento, observações) e o
// programa (frequência, divisão, metas), mas NUNCA as cargas: cada aluno tem
// as suas. Tudo entra como novo (sem ids) no aluno de destino.
// ============================================================================
import type { PlanoAtivo, ProgramaInput, TreinoInput } from "@/lib/data/programas";
import type { TreinoLetra } from "@/lib/supabase/types-sessoes";

export type ProtocoloCopiado = { programa: ProgramaInput; treinos: TreinoInput[] };

export function copiarProtocolo(origem: PlanoAtivo, destinoAtual: PlanoAtivo["programa"] = null): ProtocoloCopiado {
  const p = origem.programa;
  const treinos: TreinoInput[] = origem.treinos
    .filter((t) => t.ativo)
    .map((t) => ({
      letra: t.letra as TreinoLetra,
      nome: t.nome,
      ativo: true,
      observacoes: t.observacoes,
      duracao_estimada_min: t.duracao_estimada_min ?? null,
      tempo_alvo_min: t.tempo_alvo_min ?? null,
      exercicios: t.exercicios.map((e) => ({
        nome: e.nome,
        series: e.series,
        reps: e.reps,
        ie: e.ie,
        rir: e.rir ?? null,
        descanso_seg: e.descanso_seg,
        observacoes: e.observacoes,
        series_config: e.series_config ?? null,
        biblioteca_id: e.biblioteca_id ?? null,
        grupo_muscular: e.grupo_muscular,
        grupos_secundarios: e.grupos_secundarios ?? [],
        grupo_origem: e.grupo_origem ?? null,
        grupo_confianca: e.grupo_confianca ?? null,
        series_aquecimento: e.series_aquecimento ?? 0,
        tecnica: e.tecnica ?? "normal",
        tecnica_extras: e.tecnica_extras ?? null,
        tecnica_series: e.tecnica_series ?? null,
        tecnica_config: e.tecnica_config ?? null,
        descanso_apos_seg: e.descanso_apos_seg ?? null,
        cadencia: e.cadencia ?? null,
        prioridade: e.prioridade ?? "normal",
        bloco: e.bloco ?? null,
        unilateral: !!e.unilateral,
        carga_alvo: null, // cargas não vão: cada aluno tem as suas
        conta_volume: e.conta_volume !== false,
      })),
    }));
  const programa: ProgramaInput = {
    nome: p?.nome ?? "Programa atual",
    objetivo: p?.objetivo ?? destinoAtual?.objetivo ?? null,
    nivel: p?.nivel ?? destinoAtual?.nivel ?? null,
    split: p?.split ?? null,
    modo_semana: p?.modo_semana ?? "fixa",
    frequencia: p?.frequencia && Object.keys(p.frequencia).length ? p.frequencia : Object.fromEntries(treinos.map((t) => [t.letra, 1])),
    calendario: p?.calendario ?? {},
    metas_volume: p?.metas_volume ?? {},
    prioridades: p?.prioridades ?? [],
    equipamentos: p?.equipamentos ?? [],
    duracao_min: p?.duracao_min ?? null,
    permite_versao_reduzida: p?.permite_versao_reduzida ?? false,
    observacoes: p?.observacoes ?? null,
    fase: p?.fase ?? null,
  };
  return { programa, treinos };
}
