// ============================================================================
// Técnicas avançadas no volume semanal — quanto cada técnica vale em "séries
// válidas". Regras explícitas e configuráveis (VOLUME-TECNICAS.md tem as
// fontes). Nada aqui é "o certo": é uma convenção declarada, mostrada ao
// treinador, que pode trocar a regra sem alterar a prescrição salva.
// ============================================================================

import type { Tecnica } from "./calcular";

/** Técnicas cujas "extensões" (drops / mini-séries) podem somar volume. */
export type TecnicaComExtras = "dropset" | "rest_pause" | "myo_reps";
export const TECNICAS_COM_EXTRAS: TecnicaComExtras[] = ["dropset", "rest_pause", "myo_reps"];

export type RegraTecnicas = "classica" | "moderada" | "alta";

type Parametros = { porExtra: number; tetoPorSerie: number };

/**
 * Valor de cada drop/mini-série e o teto por série (já contando a série principal = 1).
 * - classica: só a série principal conta (drops e minis não somam).
 * - moderada (padrão): meio-termo conservador entre estudos e prática de treinadores.
 * - alta: cada drop/mini vale uma série inteira (leitura mais generosa).
 */
export const REGRAS_TECNICAS: Record<RegraTecnicas, { label: string; descricao: string; params: Record<TecnicaComExtras, Parametros> }> = {
  classica: {
    label: "Clássica (1 por série)",
    descricao: "Drop set, rest-pause e myo-reps contam 1 série por série prescrita; drops e mini-séries não somam.",
    params: {
      dropset: { porExtra: 0, tetoPorSerie: 1 },
      rest_pause: { porExtra: 0, tetoPorSerie: 1 },
      myo_reps: { porExtra: 0, tetoPorSerie: 1 },
    },
  },
  moderada: {
    label: "Moderada (padrão)",
    descricao: "Drop set: +0,5 por drop (máx. 2 por série). Rest-pause: +0,5 por mini-série (máx. 2). Myo-reps: +⅓ por mini-série (máx. 2,5).",
    params: {
      dropset: { porExtra: 0.5, tetoPorSerie: 2 },
      rest_pause: { porExtra: 0.5, tetoPorSerie: 2 },
      myo_reps: { porExtra: 1 / 3, tetoPorSerie: 2.5 },
    },
  },
  alta: {
    label: "Alta (cada drop/mini = 1)",
    descricao: "Cada drop ou mini-série conta como uma série inteira (máx. 4 por série).",
    params: {
      dropset: { porExtra: 1, tetoPorSerie: 4 },
      rest_pause: { porExtra: 1, tetoPorSerie: 4 },
      myo_reps: { porExtra: 1, tetoPorSerie: 4 },
    },
  },
};

/** Nome curto de cada técnica (tabelas e listas). */
export const TECNICA_CURTA: Record<Tecnica, string> = {
  normal: "",
  superset: "superset",
  biset: "bi-set",
  dropset: "drop set",
  rest_pause: "rest-pause",
  cluster: "cluster",
  piramide: "pirâmide",
  isometria: "isometria",
  unilateral: "unilateral",
  myo_reps: "myo-reps",
  piramide_decrescente: "pirâmide decrescente",
  triset: "tri-set",
  combinado: "combinado",
  pre_exaustao: "pré-exaustão",
  tres_sete: "3/7",
  super_slow: "super slow",
  negativo: "negativo",
};

/**
 * Métodos que agrupam exercícios seguidos (mesmo “bloco”): feitos em
 * sequência, sem descanso entre eles; o descanso vem no fim da rodada.
 * Cada exercício conta as próprias séries no volume.
 */
export const TECNICAS_BLOCO: Tecnica[] = ["superset", "biset", "triset", "combinado", "pre_exaustao"];
export const ehTecnicaBloco = (t: Tecnica | string | null | undefined): boolean => !!t && (TECNICAS_BLOCO as string[]).includes(t);
/** Quantos exercícios o método liga a partir deste (incluindo ele). */
export const TAMANHO_BLOCO: Partial<Record<Tecnica, number>> = { superset: 2, biset: 2, triset: 3, combinado: 2, pre_exaustao: 2 };

export type GrupoMetodo = "Básico" | "Progressivos" | "Combinados" | "Intensificadores" | "Tempo/Técnica";
export type Metodo = { v: Tecnica; l: string; desc: string; grupo: GrupoMetodo };

/** Catálogo de métodos do montador (ordem e grupos como o personal usa). */
export const METODOS: Metodo[] = [
  { v: "normal", l: "Tradicional", desc: "Séries e repetições padrão", grupo: "Básico" },
  { v: "piramide", l: "Pirâmide crescente", desc: "Peso aumenta, reps diminuem", grupo: "Progressivos" },
  { v: "piramide_decrescente", l: "Pirâmide decrescente", desc: "Peso diminui, reps aumentam", grupo: "Progressivos" },
  { v: "biset", l: "Bi-set", desc: "2 exercícios sem descanso", grupo: "Combinados" },
  { v: "triset", l: "Tri-set", desc: "3 exercícios sem descanso", grupo: "Combinados" },
  { v: "superset", l: "Super-set", desc: "Agonista + antagonista", grupo: "Combinados" },
  { v: "combinado", l: "Combinado", desc: "2 exercícios combinados", grupo: "Combinados" },
  { v: "pre_exaustao", l: "Pré-exaustão", desc: "Isolador antes de composto", grupo: "Combinados" },
  { v: "rest_pause", l: "Rest-pause", desc: "Pausas curtas entre mini-séries", grupo: "Intensificadores" },
  { v: "dropset", l: "Drop-set", desc: "Redução de carga sem descanso", grupo: "Intensificadores" },
  { v: "cluster", l: "Cluster", desc: "Mini-séries com pausas intra", grupo: "Intensificadores" },
  { v: "myo_reps", l: "Myo-reps", desc: "Ativação + mini-séries", grupo: "Intensificadores" },
  { v: "tres_sete", l: "3/7", desc: "De 3 a 7 reps progressivo", grupo: "Intensificadores" },
  { v: "super_slow", l: "Super slow", desc: "Cadência ultra lenta", grupo: "Tempo/Técnica" },
  { v: "negativo", l: "Negativo", desc: "Ênfase na fase excêntrica", grupo: "Tempo/Técnica" },
  { v: "isometria", l: "Isometria", desc: "Segurar a posição pelo tempo indicado", grupo: "Tempo/Técnica" },
  { v: "unilateral", l: "Unilateral", desc: "Um lado de cada vez", grupo: "Tempo/Técnica" },
];

/** Valores assumidos quando o treinador não informa (mostrados como "assumido"). */
export const EXTRAS_PADRAO: Record<TecnicaComExtras, number> = { dropset: 1, rest_pause: 2, myo_reps: 3 };

export const ROTULO_EXTRA: Record<TecnicaComExtras, { um: string; varios: string }> = {
  dropset: { um: "drop", varios: "drops" },
  rest_pause: { um: "mini-série", varios: "mini-séries" },
  myo_reps: { um: "mini-série", varios: "mini-séries" },
};

export function temExtras(t: Tecnica | null | undefined): t is TecnicaComExtras {
  return !!t && (TECNICAS_COM_EXTRAS as string[]).includes(t);
}

/** Em quantas séries válidas a técnica é aplicada quando não informado. */
export function seriesComTecnicaPadrao(t: TecnicaComExtras, validas: number): number {
  // Drop set e rest-pause costumam ir na última série; myo-reps é o formato de todas.
  return t === "myo_reps" ? validas : Math.min(1, validas);
}

export type EntradaTecnica = {
  tecnica?: Tecnica | null;
  /** Drops (drop set) ou mini-séries (rest-pause, myo-reps) em cada série com a técnica. */
  tecnicaExtras?: number | null;
  /** Quantas das séries válidas usam a técnica. */
  tecnicaSeries?: number | null;
};

export type ResultadoTecnica = {
  /** Séries a somar além das séries válidas (já multiplicadas pelas séries com técnica). */
  bonus: number;
  /** true quando drops/minis ou nº de séries foram assumidos por falta de informação. */
  assumido: boolean;
  extras: number;
  seriesComTecnica: number;
};

const inteiro = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : Math.max(0, Math.floor(n));
};

/** Bônus de volume da técnica para um exercício com `validas` séries válidas. */
export function bonusTecnica(ex: EntradaTecnica, validas: number, regra: RegraTecnicas = "moderada"): ResultadoTecnica {
  const nada = { bonus: 0, assumido: false, extras: 0, seriesComTecnica: 0 };
  if (!temExtras(ex.tecnica) || validas <= 0) return nada;
  const t = ex.tecnica;
  const extrasInf = inteiro(ex.tecnicaExtras);
  const seriesInf = inteiro(ex.tecnicaSeries);
  const extras = Math.min(10, extrasInf ?? EXTRAS_PADRAO[t]);
  const seriesComTecnica = Math.min(validas, seriesInf ?? seriesComTecnicaPadrao(t, validas));
  const p = REGRAS_TECNICAS[regra].params[t];
  const porSerie = Math.min(p.tetoPorSerie - 1, extras * p.porExtra);
  return {
    bonus: Math.max(0, porSerie) * seriesComTecnica,
    assumido: extrasInf === null || seriesInf === null,
    extras,
    seriesComTecnica,
  };
}

/** Fator pela proximidade da falha (opcional): RIR 0–3 = 1; 4–5 = 0,5; acima de 5 = 0. */
export function fatorRir(rir: number | null | undefined): number {
  if (rir === null || rir === undefined || !Number.isFinite(rir)) return 1;
  if (rir <= 3) return 1;
  if (rir <= 5) return 0.5;
  return 0;
}

/** Texto curto para o aluno/treinador: "1 drop na última série", "3 mini-séries em cada série". */
export function descreverTecnica(ex: EntradaTecnica, validas: number): string | null {
  if (!temExtras(ex.tecnica)) return null;
  const r = bonusTecnica(ex, Math.max(1, validas), "classica");
  const rot = ROTULO_EXTRA[ex.tecnica];
  const qtd = `${r.extras} ${r.extras === 1 ? rot.um : rot.varios}`;
  const onde = r.seriesComTecnica >= validas && validas > 1 ? "em cada série" : r.seriesComTecnica === 1 ? "na última série" : `nas últimas ${r.seriesComTecnica} séries`;
  return `${qtd} ${onde}`;
}

/**
 * Cor de cada método (montador e treino do aluno): bater o olho e saber qual é.
 * Família parecida = tom parecido; intensificadores com cores fortes e distintas.
 */
export const COR_TECNICA: Record<Tecnica, string | null> = {
  normal: null,
  piramide: "#38bdf8",
  piramide_decrescente: "#60a5fa",
  biset: "#a78bfa",
  triset: "#c084fc",
  superset: "#818cf8",
  combinado: "#a78bfa",
  pre_exaustao: "#e879f9",
  rest_pause: "#fb923c",
  dropset: "#f87171",
  myo_reps: "#f472b6",
  cluster: "#2dd4bf",
  tres_sete: "#a3e635",
  super_slow: "#22d3ee",
  negativo: "#06b6d4",
  isometria: "#facc15",
  unilateral: "#34d399",
};
