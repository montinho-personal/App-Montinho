// ============================================================================
// Grupos musculares — taxonomia, rótulos e resolução de grupo por exercício.
//
// Regras (Prompt Mestre §4.1):
//  • Quadríceps, posteriores de coxa, glúteos e panturrilhas são SEPARADOS.
//    "pernas" continua existindo apenas como valor LEGADO ("a classificar").
//  • A fonte primária do grupo é metadado estruturado (biblioteca ou correção
//    salva pelo treinador). A detecção por nome (`detectarGrupo`) é só
//    fallback, devolve CONFIANÇA e nunca classifica em definitivo.
//  • Exercício sem grupo resolvido vai para "nao_classificado" — nunca some.
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";

export type Confianca = "alta" | "media" | "baixa";
export type GrupoOrigem = "biblioteca" | "manual" | "heuristica" | "correcao";

export type GrupoResolvido = {
  grupo: GrupoMuscular;
  secundarios: GrupoMuscular[];
  confianca: Confianca;
  origem: GrupoOrigem;
  /** true quando o treinador deveria revisar (heurística ou legado "pernas"). */
  revisar: boolean;
};

/** Normaliza texto: minúsculas, sem acento, espaços únicos. Espelha `normalizar_nome()` do banco. */
export function normalizarNome(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Rótulos e cores
// ---------------------------------------------------------------------------
export const GRUPO_LABEL: Record<GrupoMuscular, string> = {
  peito: "Peitoral",
  costas: "Costas",
  ombros: "Ombros",
  ombro_anterior: "Ombro anterior",
  ombro_lateral: "Ombro lateral",
  ombro_posterior: "Ombro posterior",
  trapezio: "Trapézio",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebraco: "Antebraço",
  quadriceps: "Quadríceps",
  posteriores: "Posteriores de coxa",
  gluteo: "Glúteos",
  adutores: "Adutores",
  abdutores: "Abdutores",
  panturrilha: "Panturrilhas",
  abdomen: "Abdômen",
  core: "Core",
  lombar: "Lombar",
  cardio: "Cardio",
  full_body: "Corpo inteiro",
  pernas: "Pernas (a classificar)",
  nao_classificado: "Não classificado",
  outro: "Outro",
};

export const GRUPO_COR: Record<GrupoMuscular, string> = {
  peito: "#e05d5d",
  costas: "#4f8cff",
  ombros: "#e3b341",
  ombro_anterior: "#e3b341",
  ombro_lateral: "#d9a02e",
  ombro_posterior: "#c48f24",
  trapezio: "#b98f5a",
  biceps: "#36c3d6",
  triceps: "#f28a3c",
  antebraco: "#a78bfa",
  quadriceps: "#34c76c",
  posteriores: "#1f9e5a",
  gluteo: "#ec5aa0",
  adutores: "#5fb8a0",
  abdutores: "#7cc48f",
  panturrilha: "#8da2b8",
  abdomen: "#9ccc3a",
  core: "#9ccc3a",
  lombar: "#c9a66b",
  cardio: "#6b7280",
  full_body: "#8b5cf6",
  pernas: "#9aa3ad",
  nao_classificado: "#9aa3ad",
  outro: "#9aa3ad",
};

/** Ordem de exibição na Tabela de Volume (superiores → inferiores → core → outros). */
export const GRUPOS_ORDEM: GrupoMuscular[] = [
  "peito",
  "costas",
  "ombros",
  "ombro_anterior",
  "ombro_lateral",
  "ombro_posterior",
  "trapezio",
  "biceps",
  "triceps",
  "antebraco",
  "quadriceps",
  "posteriores",
  "gluteo",
  "adutores",
  "abdutores",
  "panturrilha",
  "abdomen",
  "core",
  "lombar",
  "pernas",
  "nao_classificado",
  "outro",
  "cardio",
  "full_body",
];

/** Grupos que o treinador pode escolher no montador (sem os legados). */
export const GRUPOS_SELECIONAVEIS: GrupoMuscular[] = [
  "peito",
  "costas",
  "ombros",
  "ombro_anterior",
  "ombro_lateral",
  "ombro_posterior",
  "trapezio",
  "biceps",
  "triceps",
  "antebraco",
  "quadriceps",
  "posteriores",
  "gluteo",
  "adutores",
  "abdutores",
  "panturrilha",
  "abdomen",
  "core",
  "lombar",
  "cardio",
  "full_body",
  "nao_classificado",
];

export const GRUPOS_INFERIORES: GrupoMuscular[] = [
  "quadriceps",
  "posteriores",
  "gluteo",
  "panturrilha",
  "adutores",
  "abdutores",
  "pernas",
];

export const GRUPOS_SUPERIORES: GrupoMuscular[] = [
  "peito",
  "costas",
  "ombros",
  "ombro_anterior",
  "ombro_lateral",
  "ombro_posterior",
  "trapezio",
  "biceps",
  "triceps",
  "antebraco",
];

/** Grupos que não entram na contagem de séries válidas por padrão. */
export const GRUPOS_SEM_VOLUME: GrupoMuscular[] = ["cardio", "outro"];

/** Grupos "de ombro" que se somam no subtotal Ombros (visão detalhada opcional). */
export const SUBGRUPOS_OMBRO: GrupoMuscular[] = ["ombro_anterior", "ombro_lateral", "ombro_posterior"];

/** Grupo legado → sinaliza revisão. */
export function isGrupoLegado(g: GrupoMuscular | null | undefined): boolean {
  return g === "pernas";
}

// ---------------------------------------------------------------------------
// Heurística de fallback (nome → grupo). Confiança nunca é "alta".
// Ordem IMPORTA: regras mais específicas primeiro.
// ---------------------------------------------------------------------------
type Regra = { rx: RegExp; grupo: GrupoMuscular; secundarios?: GrupoMuscular[]; confianca: Confianca };

const REGRAS: Regra[] = [
  // Inferiores
  { rx: /panturrilha|gemeos|soleo|gastrocn|calf/, grupo: "panturrilha", confianca: "media" },
  { rx: /hip ?thrust|elevacao pelvica|ponte de gluteo|gluteo|coice|kickback|abdutora|abducao/, grupo: "gluteo", confianca: "media" },
  { rx: /adutora|aducao/, grupo: "adutores", confianca: "media" },
  { rx: /stiff|flexora|mesa flexora|cadeira flexora|posterior|good ?morning|terra romeno|rdl|nordic/, grupo: "posteriores", secundarios: ["gluteo"], confianca: "media" },
  { rx: /bulgaro|afundo|avanco|passada|lunge/, grupo: "quadriceps", secundarios: ["gluteo"], confianca: "media" },
  { rx: /agachament|squat|leg ?press|extensora|hack|sissy|pistol/, grupo: "quadriceps", secundarios: ["gluteo"], confianca: "media" },
  { rx: /levantamento terra sumo|terra sumo/, grupo: "gluteo", secundarios: ["posteriores", "quadriceps"], confianca: "baixa" },
  { rx: /levantamento terra|\bterra\b|deadlift/, grupo: "posteriores", secundarios: ["gluteo", "costas"], confianca: "baixa" },
  // Braços
  { rx: /triceps|testa|frances|mergulho|paralela|kickback de triceps|pushdown/, grupo: "triceps", confianca: "media" },
  { rx: /rosca|biceps|scott|martelo|curl/, grupo: "biceps", confianca: "media" },
  { rx: /antebraco|punho|wrist/, grupo: "antebraco", confianca: "media" },
  // Ombros / trapézio
  { rx: /encolhimento|shrug|trapezio/, grupo: "trapezio", confianca: "media" },
  { rx: /elevacao lateral|lateral raise/, grupo: "ombros", confianca: "media" },
  { rx: /crucifixo invertido|crucifixo inverso|reverse fly|face ?pull|posterior de ombro/, grupo: "ombros", confianca: "media" },
  { rx: /elevacao frontal|front raise/, grupo: "ombros", confianca: "media" },
  { rx: /desenvolvimento|militar|arnold|ombro|overhead|remada alta/, grupo: "ombros", secundarios: ["triceps"], confianca: "media" },
  // Costas / peito
  { rx: /puxad|remad|barra fixa|pull ?down|pull ?up|costas|serrote|pullover|lat/, grupo: "costas", secundarios: ["biceps"], confianca: "media" },
  { rx: /supino|crucifixo|crossover|cross ?over|peck|peitoral|flexao de braco|flexao\b|push ?up|chest/, grupo: "peito", secundarios: ["triceps", "ombro_anterior"], confianca: "media" },
  // Core
  { rx: /lombar|hiperextensao|extensao de tronco|superman/, grupo: "lombar", confianca: "media" },
  { rx: /abdominal|abdomen|prancha|infra|supra|obliquo|vacuo|russian|dead ?bug|elevacao de pernas|crunch|plank|core/, grupo: "abdomen", confianca: "media" },
  // Cardio
  { rx: /esteira|bike|ergometric|corrida|cardio|hiit|eliptico|transport|escada|polichinelo|burpee|pular corda|remo ergometro|caminhada/, grupo: "cardio", confianca: "media" },
];

/**
 * Fallback por nome. Devolve "nao_classificado" com confiança baixa quando não
 * reconhece — nunca inventa um grupo "definitivo".
 */
export function detectarGrupo(nome: string | null | undefined): GrupoResolvido {
  const n = normalizarNome(nome);
  if (!n) {
    return { grupo: "nao_classificado", secundarios: [], confianca: "baixa", origem: "heuristica", revisar: true };
  }
  for (const r of REGRAS) {
    if (r.rx.test(n)) {
      return {
        grupo: r.grupo,
        secundarios: r.secundarios ?? [],
        confianca: r.confianca,
        origem: "heuristica",
        revisar: true,
      };
    }
  }
  return { grupo: "nao_classificado", secundarios: [], confianca: "baixa", origem: "heuristica", revisar: true };
}

// ---------------------------------------------------------------------------
// Resolução completa: override manual > correção salva > biblioteca > heurística
// ---------------------------------------------------------------------------
export type ExercicioParaResolver = {
  nome: string;
  grupo_muscular?: GrupoMuscular | null;        // override salvo no exercício
  grupos_secundarios?: GrupoMuscular[] | null;
  grupo_origem?: GrupoOrigem | null;
};

export type BibliotecaLookup = {
  /** mapa nome_normalizado (ou sinônimo normalizado) → metadados */
  porNome: Map<string, { grupo: GrupoMuscular; secundarios: GrupoMuscular[] }>;
};

export type CorrecoesLookup = Map<string, { grupo: GrupoMuscular; secundarios: GrupoMuscular[] }>;

export function montarLookupBiblioteca(
  itens: Array<{ nome: string; grupo_muscular: GrupoMuscular; grupos_secundarios?: GrupoMuscular[] | null; sinonimos?: string[] | null }>
): BibliotecaLookup {
  const porNome = new Map<string, { grupo: GrupoMuscular; secundarios: GrupoMuscular[] }>();
  for (const it of itens) {
    const v = { grupo: it.grupo_muscular, secundarios: it.grupos_secundarios ?? [] };
    porNome.set(normalizarNome(it.nome), v);
    for (const s of it.sinonimos ?? []) porNome.set(normalizarNome(s), v);
  }
  return { porNome };
}

export function resolverGrupo(
  ex: ExercicioParaResolver,
  biblioteca?: BibliotecaLookup | null,
  correcoes?: CorrecoesLookup | null
): GrupoResolvido {
  // 1. Override manual gravado no exercício (decisão do treinador)
  if (ex.grupo_muscular && ex.grupo_origem !== "heuristica") {
    return {
      grupo: ex.grupo_muscular,
      secundarios: ex.grupos_secundarios ?? [],
      confianca: "alta",
      origem: ex.grupo_origem ?? "manual",
      revisar: isGrupoLegado(ex.grupo_muscular),
    };
  }
  const n = normalizarNome(ex.nome);
  // 2. Correção salva pelo treinador (conhecimento reutilizável)
  const c = correcoes?.get(n);
  if (c) return { grupo: c.grupo, secundarios: c.secundarios, confianca: "alta", origem: "correcao", revisar: isGrupoLegado(c.grupo) };
  // 3. Biblioteca estruturada
  const b = biblioteca?.porNome.get(n);
  if (b) return { grupo: b.grupo, secundarios: b.secundarios, confianca: "alta", origem: "biblioteca", revisar: isGrupoLegado(b.grupo) };
  // 4. Override heurístico já persistido (mantém, mas pede revisão)
  if (ex.grupo_muscular) {
    return { grupo: ex.grupo_muscular, secundarios: ex.grupos_secundarios ?? [], confianca: "media", origem: "heuristica", revisar: true };
  }
  // 5. Fallback por nome
  return detectarGrupo(ex.nome);
}
