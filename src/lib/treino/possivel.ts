// ============================================================================
// “Meu treino possível hoje” — regra PURA, explícita e testada.
//
// Só adapta quando o personal autorizou (programa.permite_versao_reduzida) e
// SÓ remove exercícios inteiros, nesta ordem:
//   1. “pode adiar” (fora das prioridades musculares, do fim para o começo);
//   2. “normal” (mesma ordem);
//   “essencial” nunca sai.
// Nunca encurta descansos, nunca muda técnica, séries ou repetições.
// Superset/bi-set sai inteiro (o bloco é uma unidade).
// Se mesmo assim não couber, ou se sobrar menos que o volume mínimo da
// sessão, a resposta é “inviável” — com explicação e pedido de ajuste.
// ============================================================================

import type { ExercicioPrescrito, PrioridadeExercicio } from "@/lib/supabase/types-sessoes";
import type { ParametrosTempo } from "@/lib/tempo/estimar";
import { estimarPrescricao } from "@/lib/tempo/prescricao";

export const OPCOES_TEMPO_MIN = [20, 30, 45, 60] as const;
export const REGRAS_POSSIVEL = {
  /** Fração mínima das séries válidas planejadas que precisa ficar na versão adaptada. */
  minFracaoSeries: 0.4,
  minMinutos: 10,
  maxMinutos: 240,
};

type ExercicioLike = Pick<ExercicioPrescrito, "id" | "nome" | "series" | "reps" | "descanso_seg" | "series_aquecimento" | "tecnica" | "bloco" | "unilateral" | "grupo_muscular"> &
  Partial<Pick<ExercicioPrescrito, "series_config" | "tecnica_extras" | "tecnica_series" | "descanso_apos_seg" | "cadencia" | "prioridade">>;

export type StatusPossivel = "completo" | "reduzido" | "inviavel" | "nao_autorizado";

export type Adiado = { id: string; nome: string; prioridade: PrioridadeExercicio; series: number };

export type ResultadoPossivel = {
  status: StatusPossivel;
  tempoDisponivelMin: number;
  originalSeg: number;
  estimadoSeg: number;
  incluidos: string[];
  adiados: Adiado[];
  seriesOriginais: number;
  seriesMantidas: number;
  essenciaisSeg: number;
  explicacao: string[];
};

const seriesValidas = (e: ExercicioLike) => Math.max(0, e.series - (e.series_aquecimento ?? 0));
const min = (seg: number) => Math.round(seg / 60);

type Unidade = { ids: string[]; prioridade: PrioridadeExercicio; prioritario: boolean; ordem: number };

/** Agrupa superset/bi-set consecutivos com o mesmo bloco (mesma lógica do tempo estimado). */
function unidades(exs: ExercicioLike[], prioridadesMusculares: string[]): Unidade[] {
  const out: Unidade[] = [];
  const peso: Record<PrioridadeExercicio, number> = { adiavel: 0, normal: 1, essencial: 2 };
  exs.forEach((e, i) => {
    const bloco = e.bloco?.trim() && (e.tecnica === "superset" || e.tecnica === "biset") ? e.bloco.trim() : null;
    const anterior = out[out.length - 1];
    const prev = exs[i - 1];
    const mesmoBloco = bloco && prev && prev.bloco?.trim() === bloco && (prev.tecnica === "superset" || prev.tecnica === "biset");
    const p = e.prioridade ?? "normal";
    const prio = !!e.grupo_muscular && prioridadesMusculares.includes(e.grupo_muscular);
    if (mesmoBloco && anterior) {
      anterior.ids.push(e.id);
      if (peso[p] > peso[anterior.prioridade]) anterior.prioridade = p;
      anterior.prioritario ||= prio;
    } else out.push({ ids: [e.id], prioridade: p, prioritario: prio, ordem: i });
  });
  return out;
}

export function treinoPossivel(input: {
  exercicios: ExercicioLike[];
  tempos?: Partial<ParametrosTempo> | null;
  tempoDisponivelMin: number;
  permiteReduzida: boolean;
  prioridadesMusculares?: string[];
}): ResultadoPossivel {
  const exs = input.exercicios;
  const budget = Math.round(input.tempoDisponivelMin * 60);
  const estimar = (ids: Set<string>) => estimarPrescricao(exs.filter((e) => ids.has(e.id)), input.tempos).totalSeg;
  const todos = new Set(exs.map((e) => e.id));
  const originalSeg = estimar(todos);
  const seriesOriginais = exs.reduce((n, e) => n + seriesValidas(e), 0);
  const essenciais = new Set(exs.filter((e) => e.prioridade === "essencial").map((e) => e.id));
  const base = { tempoDisponivelMin: input.tempoDisponivelMin, originalSeg, seriesOriginais, essenciaisSeg: essenciais.size ? estimar(essenciais) : 0 };

  if (originalSeg <= budget) {
    return { ...base, status: "completo", estimadoSeg: originalSeg, incluidos: [...todos], adiados: [], seriesMantidas: seriesOriginais, explicacao: [`O treino completo está estimado em ${min(originalSeg)} min e cabe nos seus ${input.tempoDisponivelMin} min.`] };
  }
  if (!input.permiteReduzida) {
    return {
      ...base,
      status: "nao_autorizado",
      estimadoSeg: originalSeg,
      incluidos: [...todos],
      adiados: [],
      seriesMantidas: seriesOriginais,
      explicacao: [`O treino completo está estimado em ${min(originalSeg)} min.`, "O personal ainda não liberou versões reduzidas deste programa. Você pode pedir um ajuste a ele."],
    };
  }

  // Ordem de remoção: adiável antes de normal; fora das prioridades antes; do fim para o começo.
  const removiveis = unidades(exs, input.prioridadesMusculares ?? [])
    .filter((u) => u.prioridade !== "essencial")
    .sort((a, b) => (a.prioridade === b.prioridade ? 0 : a.prioridade === "adiavel" ? -1 : 1) || Number(a.prioritario) - Number(b.prioritario) || b.ordem - a.ordem);

  const mantidos = new Set(todos);
  const removidos: string[] = [];
  let estimado = originalSeg;
  for (const u of removiveis) {
    if (estimado <= budget) break;
    for (const id of u.ids) mantidos.delete(id);
    removidos.push(...u.ids);
    estimado = estimar(mantidos);
  }
  const porId = new Map(exs.map((e) => [e.id, e]));
  const adiados: Adiado[] = removidos.map((id) => {
    const e = porId.get(id)!;
    return { id, nome: e.nome, prioridade: e.prioridade ?? "normal", series: seriesValidas(e) };
  });
  const seriesMantidas = exs.filter((e) => mantidos.has(e.id)).reduce((n, e) => n + seriesValidas(e), 0);
  const incluidos = exs.filter((e) => mantidos.has(e.id)).map((e) => e.id);
  const minimo = Math.ceil(seriesOriginais * REGRAS_POSSIVEL.minFracaoSeries);

  if (estimado > budget || !incluidos.length || seriesMantidas < minimo) {
    const motivos: string[] = [];
    if (estimado > budget) motivos.push(base.essenciaisSeg ? `Só os exercícios essenciais já levam cerca de ${min(base.essenciaisSeg)} min.` : `Mesmo sem os exercícios que podem sair, o treino leva cerca de ${min(estimado)} min.`);
    else motivos.push(`Para caber em ${input.tempoDisponivelMin} min sobrariam ${seriesMantidas} de ${seriesOriginais} séries — abaixo do mínimo combinado para esta sessão (${minimo}).`);
    return {
      ...base,
      status: "inviavel",
      estimadoSeg: estimado,
      incluidos,
      adiados,
      seriesMantidas,
      explicacao: [`Não há uma versão segura deste treino para ${input.tempoDisponivelMin} min.`, ...motivos, "Os descansos e as técnicas não são encurtados para caber no tempo. Você pode pedir um ajuste ao personal ou treinar outro dia."],
    };
  }
  return {
    ...base,
    status: "reduzido",
    estimadoSeg: estimado,
    incluidos,
    adiados,
    seriesMantidas,
    explicacao: [
      `Versão de cerca de ${min(estimado)} min (o completo leva ${min(originalSeg)} min).`,
      `Ficam para outro dia: ${adiados.map((a) => a.nome).join(", ")}.`,
      "Descansos, séries e técnicas dos exercícios mantidos não mudam.",
    ],
  };
}
