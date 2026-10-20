// ============================================================================
// Motor da Tabela de Volume Semanal (Prompt Mestre §4.1).
//
// Unidade primária: SÉRIES VÁLIDAS PRESCRITAS por grupo muscular por semana.
//  • Aquecimento não conta. Cardio/"outro" não contam por padrão.
//  • Frequência planejada por letra multiplica o volume do dia (ABC 5x com
//    A e B repetidos → A×2, B×2, C×1).
//  • Direto (músculo principal) é o padrão. Estímulo secundário é uma camada
//    SEPARADA, heurística e ajustável — nunca somada ao total sem rótulo.
//  • Grupo desconhecido → "nao_classificado"; nunca desaparece.
//  • Metas vêm do programa do aluno. Sem meta → "sem meta". Rótulos neutros.
// Função pura, síncrona, sem dependência de servidor: a UI recalcula a cada tecla.
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import {
  GRUPO_LABEL,
  GRUPOS_INFERIORES,
  GRUPOS_ORDEM,
  GRUPOS_SEM_VOLUME,
  GRUPOS_SUPERIORES,
  SUBGRUPOS_OMBRO,
  type Confianca,
} from "@/lib/grupos";
import { bonusTecnica, EXTRAS_PADRAO, fatorRir, REGRAS_TECNICAS, temExtras, type RegraTecnicas } from "./tecnicas";

export type Tecnica =
  | "normal"
  | "superset"
  | "biset"
  | "dropset"
  | "rest_pause"
  | "cluster"
  | "piramide"
  | "isometria"
  | "unilateral"
  | "myo_reps";

export type ExercicioVolume = {
  id: string;
  nome: string;
  grupo: GrupoMuscular;
  secundarios?: GrupoMuscular[];
  confianca?: Confianca;
  /** Total de séries prescritas (inclui aquecimento, se houver). */
  series: number | null | undefined;
  /** Séries de aquecimento dentro de `series` (não contam como válidas). */
  seriesAquecimento?: number | null;
  tecnica?: Tecnica | null;
  /** Drops (drop set) ou mini-séries (rest-pause, myo-reps) por série com a técnica. */
  tecnicaExtras?: number | null;
  /** Quantas séries válidas usam a técnica (padrão: última série; myo-reps: todas). */
  tecnicaSeries?: number | null;
  /** RIR prescrito (usado só com `ajustarPorRir`). */
  rir?: number | null;
  /** false para cardio/mobilidade/técnica sem equivalência direta. */
  contaVolume?: boolean | null;
  /** Peso de cada músculo secundário (da biblioteca). Sem peso: usa `fatorSecundario`. */
  pesosSecundarios?: Partial<Record<GrupoMuscular, number>> | null;
};

export type DiaVolume = {
  letra: string;
  nome?: string;
  ativo?: boolean;
  exercicios: ExercicioVolume[];
};

/** Vezes por semana (ou por microciclo normalizado) que cada letra é executada. */
export type Frequencia = Record<string, number>;

export type MetaVolume = { min: number; max: number };

export type CalendarioFixo = { modo: "fixa"; dias: Array<{ dia: number; letra: string | null }> };
export type CalendarioRotativo = { modo: "rotativo"; sequencia: string[]; diasPorSemana: number };
export type Calendario = CalendarioFixo | CalendarioRotativo;

export type OpcoesVolume = {
  frequencia: Frequencia;
  metas?: Partial<Record<GrupoMuscular, MetaVolume>> | null;
  /** Camada opcional de estímulo secundário (heurística). */
  incluirSecundario?: boolean;
  /** Fração de série atribuída ao secundário quando não há peso da biblioteca (padrão 0.5). */
  fatorSecundario?: number;
  /** Usa os pesos por exercício da biblioteca (padrão true). false = fator único para todos. */
  usarPesosBiblioteca?: boolean;
  /** Agrupa ombro anterior/lateral/posterior em "ombros" (padrão true). */
  agruparOmbros?: boolean;
  /** Como drops/mini-séries entram no volume (padrão "moderada"). Ver tecnicas.ts. */
  regraTecnicas?: RegraTecnicas;
  /** Reduz séries longe da falha pelo RIR prescrito (RIR 4–5 = 0,5; >5 = 0). Padrão false. */
  ajustarPorRir?: boolean;
};

export type StatusMeta = "abaixo" | "na_meta" | "acima" | "sem_meta";

export type LinhaVolume = {
  grupo: GrupoMuscular;
  label: string;
  porDia: Record<string, number>;
  total: number;
  meta: MetaVolume | null;
  /** total − meta.min quando abaixo; total − meta.max quando acima; 0 na meta; null sem meta. */
  diferenca: number | null;
  status: StatusMeta;
  /** Sessões por semana em que o grupo recebe ≥1 série válida. */
  frequencia: number;
  /** Estímulo secundário estimado (heurístico, separado do total). */
  secundario: number;
  /** Parte do total que vem de drops/mini-séries de técnicas avançadas. */
  deTecnicas: number;
  /** Técnicas usadas nos exercícios diretos do grupo e quanto cada uma somou (0 = só conta 1 por série). */
  tecnicas: Partial<Record<Tecnica, number>>;
  /** Estimativa ponderada = séries diretas + secundário estimado (nunca substitui o total direto). */
  ponderado: number;
  /** Quantos exercícios deste grupo precisam de revisão (heurística/legado). */
  exerciciosRevisar: number;
  inferior: boolean;
  superior: boolean;
};

export type ResultadoVolume = {
  letras: string[];
  linhas: LinhaVolume[];
  subtotais: { inferiores: number; superiores: number; total: number };
  sessoesSemana: number;
  avisos: string[];
};

export const STATUS_META_LABEL: Record<StatusMeta, string> = {
  abaixo: "Abaixo da meta definida",
  na_meta: "Na meta definida",
  acima: "Acima da meta definida",
  sem_meta: "Sem meta",
};

// ---------------------------------------------------------------------------
// Sanitização
// ---------------------------------------------------------------------------
function inteiroNaoNegativo(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Séries válidas de um exercício (prescritas − aquecimento), nunca negativo. */
export function seriesValidas(ex: ExercicioVolume): number {
  if (ex.contaVolume === false) return 0;
  const total = inteiroNaoNegativo(ex.series);
  const aquec = Math.min(total, inteiroNaoNegativo(ex.seriesAquecimento));
  return total - aquec;
}

function canonizarGrupo(g: GrupoMuscular | null | undefined, agruparOmbros: boolean): GrupoMuscular {
  if (!g) return "nao_classificado";
  if (g === "outro") return "nao_classificado";
  if (agruparOmbros && SUBGRUPOS_OMBRO.includes(g)) return "ombros";
  return g;
}

// ---------------------------------------------------------------------------
// Frequência a partir de calendário
// ---------------------------------------------------------------------------
/**
 * Deriva a frequência semanal por letra.
 *  • Semana fixa: conta as ocorrências de cada letra nos 7 dias.
 *  • Rotativo (ex.: ABC com 5 dias/semana): média semanal = diasPorSemana × (ocorrências na sequência ÷ tamanho).
 *    Para ABC 5x → A 1,67 · B 1,67 · C 1,67 (ciclo completo a cada 4,2 dias).
 */
export function frequenciaDoCalendario(cal: Calendario | null | undefined): Frequencia {
  const out: Frequencia = {};
  if (!cal) return out;
  if (cal.modo === "fixa") {
    for (const d of cal.dias ?? []) {
      if (!d.letra) continue;
      out[d.letra] = (out[d.letra] ?? 0) + 1;
    }
    return out;
  }
  const seq = (cal.sequencia ?? []).filter(Boolean);
  const dias = Math.max(0, Number(cal.diasPorSemana) || 0);
  if (!seq.length || !dias) return out;
  const fator = dias / seq.length;
  for (const l of seq) out[l] = (out[l] ?? 0) + fator;
  for (const k of Object.keys(out)) out[k] = Math.round(out[k] * 100) / 100;
  return out;
}

/** Frequência "por microciclo" (uma passagem completa pela sequência). */
export function frequenciaPorMicrociclo(cal: CalendarioRotativo): { frequencia: Frequencia; diasCiclo: number } {
  const freq: Frequencia = {};
  for (const l of cal.sequencia) freq[l] = (freq[l] ?? 0) + 1;
  const diasCiclo = cal.diasPorSemana > 0 ? (cal.sequencia.length * 7) / cal.diasPorSemana : 0;
  return { frequencia: freq, diasCiclo: Math.round(diasCiclo * 10) / 10 };
}

// ---------------------------------------------------------------------------
// Cálculo principal
// ---------------------------------------------------------------------------
export function calcularVolumeSemanal(dias: DiaVolume[], opcoes: OpcoesVolume): ResultadoVolume {
  const agruparOmbros = opcoes.agruparOmbros ?? true;
  const fatorSec = Number.isFinite(opcoes.fatorSecundario) ? Math.max(0, Math.min(1, opcoes.fatorSecundario!)) : 0.5;
  const usarPesos = opcoes.usarPesosBiblioteca ?? true;
  let usouPesos = false;
  const avisos: string[] = [];

  const letras = dias.map((d) => d.letra);
  const porGrupo = new Map<GrupoMuscular, LinhaVolume>();
  const getLinha = (g: GrupoMuscular): LinhaVolume => {
    let l = porGrupo.get(g);
    if (!l) {
      l = {
        grupo: g,
        label: GRUPO_LABEL[g] ?? g,
        porDia: Object.fromEntries(letras.map((x) => [x, 0])),
        total: 0,
        meta: null,
        diferenca: null,
        status: "sem_meta",
        frequencia: 0,
        secundario: 0,
        ponderado: 0,
        deTecnicas: 0,
        tecnicas: {},
        exerciciosRevisar: 0,
        inferior: GRUPOS_INFERIORES.includes(g),
        superior: GRUPOS_SUPERIORES.includes(g),
      };
      porGrupo.set(g, l);
    }
    return l;
  };

  let sessoesSemana = 0;
  const regra: RegraTecnicas = opcoes.regraTecnicas && REGRAS_TECNICAS[opcoes.regraTecnicas] ? opcoes.regraTecnicas : "moderada";
  let usouTecnica = false;
  let tecnicaAssumida = false;
  let avisoCluster = false;
  let reduziuRir = false;
  let avisoAquec = false;

  for (const dia of dias) {
    const ativo = dia.ativo !== false;
    const vezes = ativo ? Math.max(0, Number(opcoes.frequencia[dia.letra]) || 0) : 0;
    sessoesSemana += vezes;
    // grupos tocados neste dia (para frequência por grupo)
    const tocados = new Set<GrupoMuscular>();

    for (const ex of dia.exercicios) {
      if (!ex.nome?.trim()) continue;
      const g = canonizarGrupo(ex.grupo, agruparOmbros);
      if (GRUPOS_SEM_VOLUME.includes(g) && ex.contaVolume !== true) {
        // cardio/outro: aparece na tabela com 0 para não "sumir", mas não soma
        if (g === "cardio") getLinha("cardio");
        continue;
      }
      const base = seriesValidas(ex);
      const tec = bonusTecnica(ex, base, regra);
      const fator = opcoes.ajustarPorRir ? fatorRir(ex.rir) : 1;
      if (fator < 1 && base > 0) reduziuRir = true;
      if (temExtras(ex.tecnica) && base > 0) {
        usouTecnica = true;
        if (tec.assumido) tecnicaAssumida = true;
      }
      if (ex.tecnica === "cluster") avisoCluster = true;
      const validas = (base + tec.bonus) * fator;
      const linha = getLinha(g);
      if (ex.confianca && ex.confianca !== "alta") linha.exerciciosRevisar += vezes > 0 ? 1 : 0;
      if (g === "pernas" || g === "nao_classificado") linha.exerciciosRevisar += 0; // já contado acima quando heurística
      if (inteiroNaoNegativo(ex.seriesAquecimento) > 0) avisoAquec = true;

      if (validas <= 0) continue;
      const semana = validas * vezes;
      linha.porDia[dia.letra] = (linha.porDia[dia.letra] ?? 0) + validas; // por SESSÃO do dia
      linha.total += semana;
      linha.deTecnicas += tec.bonus * fator * vezes;
      if (ex.tecnica && ex.tecnica !== "normal" && vezes > 0) linha.tecnicas[ex.tecnica] = (linha.tecnicas[ex.tecnica] ?? 0) + tec.bonus * fator * vezes;
      if (vezes > 0) tocados.add(g);

      if (opcoes.incluirSecundario) {
        const pesos = usarPesos ? ex.pesosSecundarios ?? null : null;
        for (const s of ex.secundarios ?? []) {
          const gs = canonizarGrupo(s, agruparOmbros);
          if (gs === g || GRUPOS_SEM_VOLUME.includes(gs)) continue;
          const bruto = pesos?.[s];
          const peso = typeof bruto === "number" && Number.isFinite(bruto) ? Math.max(0, Math.min(1, bruto)) : fatorSec;
          if (pesos && typeof bruto === "number") usouPesos = true;
          getLinha(gs).secundario += validas * peso * vezes;
        }
      }
    }
    for (const g of tocados) getLinha(g).frequencia += vezes;
  }

  if (avisoAquec) avisos.push("Séries de aquecimento não contam como séries válidas.");
  if (usouTecnica)
    avisos.push(
      `Técnicas avançadas — regra ${REGRAS_TECNICAS[regra].label.toLowerCase()}: ${REGRAS_TECNICAS[regra].descricao}` +
        (tecnicaAssumida ? ` Onde não foi informado, assumimos ${EXTRAS_PADRAO.dropset} drop e ${EXTRAS_PADRAO.rest_pause} mini-séries no rest-pause (na última série) e ${EXTRAS_PADRAO.myo_reps} mini-séries no myo-reps (em todas).` : "")
    );
  if (avisoCluster) avisos.push("Cluster conta 1 série por série prescrita (as pausas internas não somam séries).");
  if (reduziuRir) avisos.push("Ajuste por RIR ligado: séries com RIR 4–5 contam 0,5 e acima de 5 não contam.");
  if (opcoes.incluirSecundario)
    avisos.push(
      usouPesos
        ? `Volume ponderado = séries diretas + secundário estimado com os pesos de cada exercício da biblioteca (ex.: supino: tríceps 0,5). Sem peso cadastrado, usa ${Math.round(fatorSec * 100)}% por série. A comparação com a meta usa esse total (direto + secundário).`
        : `Estímulo secundário estimado (${Math.round(fatorSec * 100)}% por série) somado ao direto na comparação com a meta.`
    );
  if (!agruparOmbros && opcoes.metas && (opcoes.metas as Record<string, unknown>).ombros)
    avisos.push("Há meta para “Ombros” no total, mas os deltoides estão separados (anterior, lateral e posterior). Defina metas por porção ou agrupe os ombros.");

  // metas e status
  const metas = opcoes.metas ?? {};
  for (const linha of porGrupo.values()) {
    const meta = metas[linha.grupo] ?? null;
    linha.meta = meta && Number.isFinite(meta.min) && Number.isFinite(meta.max) ? { min: Math.max(0, meta.min), max: Math.max(0, meta.max) } : null;
    linha.total = Math.round(linha.total * 100) / 100;
    linha.secundario = Math.round(linha.secundario * 100) / 100;
    linha.deTecnicas = Math.round(linha.deTecnicas * 100) / 100;
    for (const k of Object.keys(linha.tecnicas) as Tecnica[]) linha.tecnicas[k] = Math.round((linha.tecnicas[k] ?? 0) * 100) / 100;
    linha.ponderado = Math.round((linha.total + linha.secundario) * 100) / 100;
    linha.frequencia = Math.round(linha.frequencia * 100) / 100;
    // Com o secundário ligado, a meta é comparada com o total ponderado (direto + secundário).
    const base = opcoes.incluirSecundario ? linha.ponderado : linha.total;
    if (!linha.meta) {
      linha.status = "sem_meta";
      linha.diferenca = null;
    } else if (base < linha.meta.min) {
      linha.status = "abaixo";
      linha.diferenca = Math.round((base - linha.meta.min) * 100) / 100;
    } else if (base > linha.meta.max) {
      linha.status = "acima";
      linha.diferenca = Math.round((base - linha.meta.max) * 100) / 100;
    } else {
      linha.status = "na_meta";
      linha.diferenca = 0;
    }
  }

  // grupos com meta definida mas sem nenhuma série devem aparecer (abaixo da meta)
  for (const [g, meta] of Object.entries(metas) as Array<[GrupoMuscular, MetaVolume | undefined]>) {
    if (!meta || porGrupo.has(g)) continue;
    const l = getLinha(g);
    l.meta = { min: meta.min, max: meta.max };
    l.status = meta.min > 0 ? "abaixo" : "na_meta";
    l.diferenca = meta.min > 0 ? -meta.min : 0;
  }

  const linhas = [...porGrupo.values()].sort(
    (a, b) => GRUPOS_ORDEM.indexOf(a.grupo) - GRUPOS_ORDEM.indexOf(b.grupo)
  );

  const soma = (pred: (l: LinhaVolume) => boolean) =>
    Math.round(linhas.filter(pred).reduce((n, l) => n + l.total, 0) * 100) / 100;

  return {
    letras,
    linhas,
    subtotais: {
      inferiores: soma((l) => l.inferior),
      superiores: soma((l) => l.superior),
      total: soma(() => true),
    },
    sessoesSemana: Math.round(sessoesSemana * 100) / 100,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// Programado vs realizado (sessões concluídas)
// ---------------------------------------------------------------------------
export type SerieRealizada = { grupo: GrupoMuscular | null | undefined; tipo?: string | null };

export function volumeRealizadoPorGrupo(series: SerieRealizada[], agruparOmbros = true): Partial<Record<GrupoMuscular, number>> {
  const out: Partial<Record<GrupoMuscular, number>> = {};
  for (const s of series) {
    if (s.tipo && s.tipo !== "valida" && s.tipo !== "dropset" && s.tipo !== "rest_pause" && s.tipo !== "cluster" && s.tipo !== "isometria") continue;
    const g = canonizarGrupo(s.grupo ?? null, agruparOmbros);
    if (GRUPOS_SEM_VOLUME.includes(g)) continue;
    out[g] = (out[g] ?? 0) + 1;
  }
  return out;
}

export function compararProgramadoRealizado(
  programado: ResultadoVolume,
  realizado: Partial<Record<GrupoMuscular, number>>
): Array<{ grupo: GrupoMuscular; label: string; programado: number; realizado: number; aderencia: number | null }> {
  const grupos = new Set<GrupoMuscular>([...programado.linhas.map((l) => l.grupo), ...(Object.keys(realizado) as GrupoMuscular[])]);
  return [...grupos]
    .sort((a, b) => GRUPOS_ORDEM.indexOf(a) - GRUPOS_ORDEM.indexOf(b))
    .map((g) => {
      const p = programado.linhas.find((l) => l.grupo === g)?.total ?? 0;
      const r = realizado[g] ?? 0;
      return { grupo: g, label: GRUPO_LABEL[g] ?? g, programado: p, realizado: r, aderencia: p > 0 ? Math.round((r / p) * 100) : null };
    });
}
