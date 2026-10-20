// ============================================================================
// Estimativa de duração da sessão (montador e ritmo do treino).
//
// TEMPO = preparação inicial + execução das séries (+ aquecimento)
//       + descansos entre séries + descansos após cada exercício (menos o último)
//       + transições entre exercícios + lógica própria das técnicas.
//
// Convenções explícitas (todas configuráveis em ParametrosTempo):
//  • Descanso padrão entre séries 90 s e após o último set do exercício 120 s
//    (padrão de interface, não regra de treinamento).
//  • Transição (trocar aparelho, ajustar carga/banco, deslocar) acontece DEPOIS
//    do descanso após o exercício. Com `transicaoDentroDoDescanso`, ela ocorre
//    durante o descanso e só o que passar dele é somado.
//  • Sem cadência prescrita, cada repetição vale `segundosPorRep` (estimativa
//    sinalizada no resultado).
//  • Precedência do descanso: série > exercício > treino > treinador > app.
// ============================================================================

import type { Tecnica } from "@/lib/volume/calcular";
import { EXTRAS_PADRAO, seriesComTecnicaPadrao, temExtras } from "@/lib/volume/tecnicas";

export type ParametrosTempo = {
  descansoEntreSeriesSeg: number;
  descansoAposExercicioSeg: number;
  segundosPorRep: number;
  transicaoSeg: number;
  transicaoDentroDoDescanso: boolean;
  preparacaoInicialSeg: number;
  descansoAquecimentoSeg: number;
  /** Drop set: reps de cada drop como fração das reps da série e tempo para baixar a carga. */
  fracaoRepsDrop: number;
  trocaDropSeg: number;
  /** Rest-pause / myo-reps: pausa antes de cada mini-série e reps de cada mini. */
  pausaMiniSerieSeg: number;
  repsMiniSerie: number;
  /** Cluster: blocos por série e pausa entre blocos. */
  clusterBlocos: number;
  clusterPausaSeg: number;
  /** Superset/bi-set: troca entre os exercícios do bloco. */
  trocaSupersetSeg: number;
};

export const PARAMETROS_TEMPO_PADRAO: ParametrosTempo = {
  descansoEntreSeriesSeg: 90,
  descansoAposExercicioSeg: 120,
  segundosPorRep: 3,
  transicaoSeg: 45,
  transicaoDentroDoDescanso: false,
  preparacaoInicialSeg: 120,
  descansoAquecimentoSeg: 60,
  fracaoRepsDrop: 0.6,
  trocaDropSeg: 10,
  pausaMiniSerieSeg: 15,
  repsMiniSerie: 4,
  clusterBlocos: 3,
  clusterPausaSeg: 20,
  trocaSupersetSeg: 15,
};

/** Sobrepõe níveis (app → treinador → treino); valores ausentes/ inválidos são ignorados. */
export function mesclarParametros(...niveis: Array<Partial<ParametrosTempo> | null | undefined>): ParametrosTempo {
  const out: ParametrosTempo = { ...PARAMETROS_TEMPO_PADRAO };
  for (const n of niveis) {
    if (!n) continue;
    for (const [k, v] of Object.entries(n) as Array<[keyof ParametrosTempo, unknown]>) {
      if (k === "transicaoDentroDoDescanso") {
        if (typeof v === "boolean") out.transicaoDentroDoDescanso = v;
      } else if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        (out[k] as number) = v;
      }
    }
  }
  return out;
}

export type SerieTempo = { reps: string; descansoSeg?: number | null };

export type ExercicioTempo = {
  id: string;
  nome?: string;
  /** Séries de trabalho (sem aquecimento), na ordem; `descansoSeg` = descanso após aquela série. */
  series: SerieTempo[];
  aquecimento?: number;
  cadencia?: string | null;
  tecnica?: Tecnica | null;
  tecnicaExtras?: number | null;
  tecnicaSeries?: number | null;
  bloco?: string | null;
  unilateral?: boolean;
  /** Descanso após o último set (antes do próximo exercício). */
  descansoAposSeg?: number | null;
};

export type ResultadoTempo = {
  totalSeg: number;
  execucaoSeg: number;
  descansoSeg: number;
  transicaoSeg: number;
  exercicios: number;
  series: number;
  /** O que foi estimado por falta de informação (cadência, reps "até a falha"…). */
  estimativas: string[];
  /** Fim previsto (em s desde o início) de cada exercício, na ordem — usado no ritmo do treino. */
  marcos: Array<{ id: string; fimSeg: number; seriesAteAqui: number }>;
};

// ---------------------------------------------------------------------------
// Interpretação de repetições e cadência
// ---------------------------------------------------------------------------
type Execucao = { seg: number; estimada: "cadencia" | "reps" | null };

/** Segundos por repetição a partir da cadência ("3-1-2", "3012", "2-0-X-0"); null se não houver. */
export function segundosDaCadencia(c: string | null | undefined): number | null {
  if (!c) return null;
  const partes = c.trim().toUpperCase().match(/[0-9X]/g);
  if (!partes || partes.length < 2) {
    const n = Number(c.replace(",", ".").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 && n < 30 ? n : null;
  }
  const total = partes.reduce((s, p) => s + (p === "X" ? 1 : Number(p)), 0);
  return total > 0 ? total : null;
}

/** Duração fixa em segundos ("40s", "1min", "1:30", "20 min"); null se for por repetições. */
export function duracaoFixa(reps: string): number | null {
  const r = reps.trim().toLowerCase();
  const mmss = r.match(/^(\d{1,2}):(\d{2})/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const min = r.match(/(\d+(?:[.,]\d+)?)\s*(min|minutos?)\b/);
  if (min) return Math.round(Number(min[1].replace(",", ".")) * 60);
  const seg = r.match(/(\d+)\s*(s|seg|segundos?)\b/);
  if (seg) return Number(seg[1]);
  return null;
}

/** Repetições previstas ("10-12" → 11; "12" → 12; "até a falha" → 12 estimado). */
export function repsPrevistas(reps: string): { n: number; estimada: boolean } {
  const nums = (reps.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0 && n < 200);
  if (/falha|amrap|m[áa]ximo/i.test(reps) && !nums.length) return { n: 12, estimada: true };
  if (!nums.length) return { n: 10, estimada: true };
  const [a, b] = nums;
  return { n: b && b > a && /[-–a]/.test(reps) ? Math.round((a + b) / 2) : a, estimada: false };
}

function execucaoSerie(reps: string, ex: ExercicioTempo, p: ParametrosTempo, fator = 1): Execucao {
  const lados = ex.unilateral || /cada|por lado|\blado\b/i.test(reps) ? 2 : 1;
  const fixo = duracaoFixa(reps);
  if (fixo !== null) return { seg: fixo * lados * fator, estimada: null };
  const { n, estimada } = repsPrevistas(reps);
  const cad = segundosDaCadencia(ex.cadencia);
  return { seg: n * fator * (cad ?? p.segundosPorRep) * lados, estimada: estimada ? "reps" : cad === null ? "cadencia" : null };
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------
type Acc = { exec: number; desc: number; trans: number; series: number; estCad: Set<string>; estReps: Set<string> };

function registrar(acc: Acc, ex: ExercicioTempo, e: Execucao) {
  acc.exec += e.seg;
  if (e.estimada === "cadencia") acc.estCad.add(ex.id);
  if (e.estimada === "reps") acc.estReps.add(ex.id);
}

/** Tempo extra das técnicas aplicado à série `i` (0-based) do exercício. */
function extrasTecnica(acc: Acc, ex: ExercicioTempo, i: number, reps: string, p: ParametrosTempo) {
  const t = ex.tecnica;
  const total = ex.series.length;
  if (t === "cluster") {
    acc.desc += Math.max(0, p.clusterBlocos - 1) * p.clusterPausaSeg; // pausas internas da série
    return;
  }
  if (!temExtras(t)) return;
  const nSeries = Math.min(total, ex.tecnicaSeries ?? seriesComTecnicaPadrao(t, total));
  if (i < total - nSeries) return; // técnica nas últimas N séries
  const extras = Math.min(10, Math.max(0, ex.tecnicaExtras ?? EXTRAS_PADRAO[t]));
  for (let k = 0; k < extras; k++) {
    if (t === "dropset") {
      registrar(acc, ex, execucaoSerie(reps, ex, p, p.fracaoRepsDrop));
      acc.trans += p.trocaDropSeg;
    } else {
      acc.desc += p.pausaMiniSerieSeg;
      registrar(acc, ex, execucaoSerie(String(p.repsMiniSerie), ex, p));
    }
  }
}

function aquecimento(acc: Acc, ex: ExercicioTempo, p: ParametrosTempo) {
  const n = Math.max(0, Math.floor(ex.aquecimento ?? 0));
  const reps = ex.series[0]?.reps ?? "10";
  for (let k = 0; k < n; k++) {
    registrar(acc, ex, execucaoSerie(reps, ex, p));
    acc.desc += p.descansoAquecimentoSeg;
  }
}

const descansoDaSerie = (s: SerieTempo | undefined, p: ParametrosTempo) =>
  s && typeof s.descansoSeg === "number" && Number.isFinite(s.descansoSeg) && s.descansoSeg >= 0 ? s.descansoSeg : p.descansoEntreSeriesSeg;

function entreExercicios(acc: Acc, ultimo: ExercicioTempo, p: ParametrosTempo) {
  const descanso = typeof ultimo.descansoAposSeg === "number" && ultimo.descansoAposSeg >= 0 ? ultimo.descansoAposSeg : p.descansoAposExercicioSeg;
  acc.desc += descanso;
  acc.trans += p.transicaoDentroDoDescanso ? Math.max(0, p.transicaoSeg - descanso) : p.transicaoSeg;
}

const ehBloco = (e: ExercicioTempo) => !!e.bloco?.trim() && (e.tecnica === "superset" || e.tecnica === "biset");

/** Agrupa superset/bi-set consecutivos com o mesmo bloco. */
function agrupar(exs: ExercicioTempo[]): ExercicioTempo[][] {
  const grupos: ExercicioTempo[][] = [];
  for (const e of exs) {
    const ant = grupos.at(-1);
    if (ant && ehBloco(e) && ehBloco(ant[0]) && ant[0].bloco!.trim().toLowerCase() === e.bloco!.trim().toLowerCase()) ant.push(e);
    else grupos.push([e]);
  }
  return grupos;
}

export function estimarDuracao(exercicios: ExercicioTempo[], parametros: Partial<ParametrosTempo> | ParametrosTempo = PARAMETROS_TEMPO_PADRAO): ResultadoTempo {
  const p = mesclarParametros(parametros);
  const validos = exercicios.filter((e) => e.series.length > 0 || (e.aquecimento ?? 0) > 0);
  const acc: Acc = { exec: 0, desc: 0, trans: 0, series: 0, estCad: new Set(), estReps: new Set() };
  const marcos: ResultadoTempo["marcos"] = [];
  if (!validos.length) return { totalSeg: 0, execucaoSeg: 0, descansoSeg: 0, transicaoSeg: 0, exercicios: 0, series: 0, estimativas: [], marcos };

  acc.trans += p.preparacaoInicialSeg;
  const grupos = agrupar(validos);
  grupos.forEach((g, gi) => {
    for (const ex of g) aquecimento(acc, ex, p);
    const rodadas = Math.max(...g.map((e) => e.series.length));
    for (let r = 0; r < rodadas; r++) {
      let ultimoNaRodada: ExercicioTempo | null = null;
      g.forEach((ex, xi) => {
        const s = ex.series[r];
        if (!s) return;
        if (ultimoNaRodada && xi > 0) acc.trans += p.trocaSupersetSeg;
        registrar(acc, ex, execucaoSerie(s.reps, ex, p));
        extrasTecnica(acc, ex, r, s.reps, p);
        acc.series += 1;
        ultimoNaRodada = ex;
      });
      if (r < rodadas - 1 && ultimoNaRodada) acc.desc += descansoDaSerie((ultimoNaRodada as ExercicioTempo).series[r], p);
    }
    if (gi < grupos.length - 1) entreExercicios(acc, g[g.length - 1], p);
    const fim = Math.round(acc.exec + acc.desc + acc.trans);
    for (const ex of g) marcos.push({ id: ex.id, fimSeg: fim, seriesAteAqui: acc.series });
  });

  const estimativas: string[] = [];
  if (acc.estCad.size) estimativas.push(`Execução estimada em ${p.segundosPorRep} s por repetição (sem cadência) em ${acc.estCad.size} exercício(s).`);
  if (acc.estReps.size) estimativas.push(`Repetições sem número fixo (ex.: "até a falha") estimadas em ${acc.estReps.size} exercício(s).`);

  const execucaoSeg = Math.round(acc.exec);
  const descansoSeg = Math.round(acc.desc);
  const transicaoSeg = Math.round(acc.trans);
  return { totalSeg: execucaoSeg + descansoSeg + transicaoSeg, execucaoSeg, descansoSeg, transicaoSeg, exercicios: validos.length, series: acc.series, estimativas, marcos };
}

/** "58 min", "1 h 05 min", "45 s". */
export function formatarDuracao(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}
