// ============================================================================
// “＋ Exercício extra” (pedido do Montinho, 04/11/2026): em qualquer treino da
// ficha (e no treino extra), aluno ou visitante pode pôr um exercício a mais da
// biblioteca, como já faz com a “+ Série extra”. Regras PURAS.
// O exercício entra na sessão com `prescricao.extra_aluno = true`, sem vínculo
// com o plano (`exercicio_id` nulo): o protocolo do personal não muda.
// Vale o troféu “Exercício Bônus” (`exercicio_extra`) no 1º treino concluído
// com pelo menos 1 série válida num exercício extra.
// ============================================================================
import type { VideoSource } from "@/lib/video";

export const PADRAO_EXERCICIO_EXTRA = { series: 3, reps: "10-12", descanso_seg: 90 } as const;
/** No máximo 5 exercícios extras por treino (o extra é um complemento, não outro treino). */
export const MAX_EXERCICIOS_EXTRAS = 5;

export type PrescricaoExtra = {
  extra_aluno: true;
  series: number;
  reps: string;
  descanso_seg: number;
  tecnica: "normal";
  series_aquecimento: 0;
  video: VideoSource | null;
  instrucoes: string[];
  equipamento: string[];
};

type SeLike = { id: string; prescricao?: unknown };

export const ehExercicioExtra = (se: SeLike | null | undefined) => !!se && (se.prescricao as { extra_aluno?: unknown } | null)?.extra_aluno === true;

export function prescricaoExtra(item: { video?: VideoSource | null; instrucoes?: string[]; equipamento?: string[] }): PrescricaoExtra {
  return {
    extra_aluno: true,
    ...PADRAO_EXERCICIO_EXTRA,
    tecnica: "normal",
    series_aquecimento: 0,
    video: item.video ?? null,
    instrucoes: (item.instrucoes ?? []).slice(0, 3),
    equipamento: item.equipamento ?? [],
  };
}

/** Quantos exercícios extras ainda cabem neste treino. */
export const extrasQueCabem = (exercicios: SeLike[]) => Math.max(0, MAX_EXERCICIOS_EXTRAS - exercicios.filter(ehExercicioExtra).length);

/**
 * O “exercício do plano” que a tela do treino usa para um exercício extra da
 * sessão (o id é o da própria linha da sessão). Os campos seguem o formato da
 * ficha, com o padrão 3 × 10–12 e 90 s de descanso.
 */
export function exercicioDoExtra(
  se: SeLike & { nome: string; biblioteca_id?: string | null; grupo_muscular?: string | null; ordem?: number; created_at?: string },
  treinoId: string,
) {
  const p = (se.prescricao ?? {}) as Partial<PrescricaoExtra>;
  return {
    id: se.id,
    treino_id: treinoId,
    ordem: se.ordem ?? 99,
    nome: se.nome,
    series: p.series ?? PADRAO_EXERCICIO_EXTRA.series,
    reps: p.reps ?? PADRAO_EXERCICIO_EXTRA.reps,
    ie: null,
    descanso_seg: p.descanso_seg ?? PADRAO_EXERCICIO_EXTRA.descanso_seg,
    observacoes: null,
    video_url: null,
    created_at: se.created_at ?? new Date(0).toISOString(),
    biblioteca_id: se.biblioteca_id ?? null,
    grupo_muscular: se.grupo_muscular ?? null,
    grupos_secundarios: [],
    grupo_origem: null,
    grupo_confianca: null,
    series_aquecimento: 0,
    tecnica: "normal" as const,
    bloco: null,
    unilateral: false,
    carga_alvo: null,
    rir: null,
    cadencia: null,
    conta_volume: true,
    removido_em: null,
    video: p.video ?? null,
    instrucoes: p.instrucoes ?? [],
    equipamento: p.equipamento ?? [],
    descricao: null,
    extraAluno: true as const,
  };
}

/** Troféu “Exercício Bônus”: 1º treino que vale (concluído ou extra, `vale`) com 1+ série feita num exercício extra. */
export function trofeuExercicioExtra<S extends { iniciado_em: string; conta_aderencia?: boolean; exercicios?: Array<{ extra?: boolean; series: Array<{ tipo: string }> }> }>(sessoes: S[], vale: (s: S) => boolean): S | null {
  const ordenadas = [...sessoes].sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  return ordenadas.find((s) => s.conta_aderencia !== false && vale(s) && (s.exercicios ?? []).some((e) => e.extra && e.series.some((x) => x.tipo !== "aquecimento"))) ?? null;
}
