// ============================================================================
// “Meu treino possível hoje” — regra PURA, explícita e testada.
//
// Só adapta quando o personal autorizou (programa.permite_versao_reduzida) e
// SÓ remove exercícios inteiros, nesta ordem:
//   1. “pode adiar” (fora das prioridades musculares, do fim para o começo);
//   2. “normal” (mesma ordem);
//   “essencial” nunca sai.
// Nunca muda técnica, séries ou repetições. Descansos só encurtam se o ALUNO
// escolher a opção “descanso 20% menor” (também exige a autorização acima):
// cada descanso vira 80% do prescrito, arredondado de 5 em 5 s, sem passar
// abaixo de 45 s (descansos já curtos ficam como estão; aquecimento não muda).
// Superset/bi-set sai inteiro (o bloco é uma unidade).
// Se mesmo assim não couber, ou se sobrar menos que o volume mínimo da
// sessão, a resposta é “inviável” — com explicação e pedido de ajuste.
// ============================================================================

import type { ExercicioPrescrito, PrioridadeExercicio } from "@/lib/supabase/types-sessoes";
import { mesclarParametros, type ParametrosTempo } from "@/lib/tempo/estimar";
import type { SerieConfig } from "@/lib/series";
import { estimarPrescricao } from "@/lib/tempo/prescricao";

export const OPCOES_TEMPO_MIN = [20, 30, 45, 60] as const;
export const REGRAS_POSSIVEL = {
  /** Fração mínima das séries válidas planejadas que precisa ficar na versão adaptada. */
  minFracaoSeries: 0.4,
  minMinutos: 10,
  maxMinutos: 240,
  /** Opção do aluno: descansos encurtados (fração do prescrito e piso em segundos). */
  descansoReduzido: { fator: 0.8, pisoSeg: 45 },
};

/** 90 s → 70 s; 120 s → 95 s; 60 s → 50 s; ≤ 45 s não muda. */
export function encurtarDescanso(seg: number): number;
export function encurtarDescanso(seg: number | null | undefined): number | null | undefined;
export function encurtarDescanso(seg: number | null | undefined) {
  if (typeof seg !== "number" || !Number.isFinite(seg) || seg <= 0) return seg;
  const { fator, pisoSeg } = REGRAS_POSSIVEL.descansoReduzido;
  if (seg <= pisoSeg) return seg;
  return Math.max(pisoSeg, Math.round((seg * fator) / 5) * 5);
}

/** Mesmo exercício, com todos os descansos (série, “iguais”, “detalhado”, após) encurtados. */
export function comDescansoReduzido<T extends ExercicioLike>(e: T): T {
  const cfg = (e.series_config ?? null) as SerieConfig | null;
  const series_config: SerieConfig | null = !cfg
    ? null
    : cfg.modo === "iguais"
      ? { ...cfg, descanso_seg: encurtarDescanso(cfg.descanso_seg) ?? null }
      : { ...cfg, series: cfg.series.map((s) => ({ ...s, descanso_seg: encurtarDescanso(s.descanso_seg) ?? null })) };
  return { ...e, descanso_seg: encurtarDescanso(e.descanso_seg) ?? null, descanso_apos_seg: encurtarDescanso(e.descanso_apos_seg) ?? null, ...(cfg ? { series_config } : {}) };
}

/** Parâmetros de tempo com os descansos padrão encurtados (aquecimento não muda). */
export function temposComDescansoReduzido(tempos?: Partial<ParametrosTempo> | null): Partial<ParametrosTempo> {
  const p = mesclarParametros(tempos ?? {});
  return { ...(tempos ?? {}), descansoEntreSeriesSeg: encurtarDescanso(p.descansoEntreSeriesSeg), descansoAposExercicioSeg: encurtarDescanso(p.descansoAposExercicioSeg) };
}

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
  /** true quando os descansos foram encurtados (opção do aluno, autorizada). */
  descansoReduzido: boolean;
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
  /** Opção “descanso 20% menor” — só vale se o personal autorizou versões reduzidas. */
  descansoReduzido?: boolean;
}): ResultadoPossivel {
  const reduzDescanso = !!input.descansoReduzido && input.permiteReduzida;
  const exs = reduzDescanso ? input.exercicios.map(comDescansoReduzido) : input.exercicios;
  const tempos = reduzDescanso ? temposComDescansoReduzido(input.tempos) : input.tempos;
  const budget = Math.round(input.tempoDisponivelMin * 60);
  const estimar = (ids: Set<string>) => estimarPrescricao(exs.filter((e) => ids.has(e.id)), tempos).totalSeg;
  const todos = new Set(exs.map((e) => e.id));
  // “O completo leva” é sempre com os descansos prescritos.
  const originalSeg = estimarPrescricao(input.exercicios, input.tempos).totalSeg;
  const completoSeg = reduzDescanso ? estimar(todos) : originalSeg;
  const seriesOriginais = exs.reduce((n, e) => n + seriesValidas(e), 0);
  const essenciais = new Set(exs.filter((e) => e.prioridade === "essencial").map((e) => e.id));
  const base = { tempoDisponivelMin: input.tempoDisponivelMin, originalSeg, seriesOriginais, essenciaisSeg: essenciais.size ? estimar(essenciais) : 0, descansoReduzido: reduzDescanso };
  const notaDescanso = "Descansos 20% menores (ex.: 1:30 → 1:10), nunca abaixo de 45 s; séries e técnicas não mudam.";

  if (completoSeg <= budget) {
    return {
      ...base,
      status: "completo",
      estimadoSeg: completoSeg,
      incluidos: [...todos],
      adiados: [],
      seriesMantidas: seriesOriginais,
      explicacao: reduzDescanso
        ? [`Com descansos menores, o treino completo leva cerca de ${min(completoSeg)} min (normal: ${min(originalSeg)} min) e cabe nos seus ${input.tempoDisponivelMin} min.`, notaDescanso]
        : [`O treino completo está estimado em ${min(originalSeg)} min e cabe nos seus ${input.tempoDisponivelMin} min.`],
    };
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
  let estimado = completoSeg;
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
      explicacao: [
        `Não há uma versão segura deste treino para ${input.tempoDisponivelMin} min.`,
        ...motivos,
        reduzDescanso ? "Mesmo com descansos 20% menores não cabe. Você pode pedir um ajuste ao personal ou treinar outro dia." : "As técnicas não são encurtadas para caber no tempo. Você pode pedir um ajuste ao personal ou treinar outro dia.",
      ],
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
      reduzDescanso ? notaDescanso : "Descansos, séries e técnicas dos exercícios mantidos não mudam.",
    ],
  };
}

/**
 * A opção “descanso 20% menor” ajuda? Só oferece quando muda o resultado:
 * passa a caber inteiro, mantém mais exercícios ou vira viável.
 */
export function ganhoDescansoReduzido(normal: ResultadoPossivel, menor: ResultadoPossivel): { ajuda: boolean; recuperados: string[] } {
  if (!menor.descansoReduzido || normal.status === "completo" || normal.status === "nao_autorizado" || menor.status === "inviavel") return { ajuda: false, recuperados: [] };
  const fora = new Set(menor.adiados.map((a) => a.id));
  const recuperados = normal.adiados.filter((a) => !fora.has(a.id)).map((a) => a.nome);
  const ajuda = normal.status === "inviavel" || recuperados.length > 0;
  return { ajuda, recuperados };
}
