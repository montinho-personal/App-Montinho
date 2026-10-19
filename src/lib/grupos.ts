// ============================================================================
// Detecção automática de grupo muscular a partir do NOME do exercício.
// Os grupos retornados são os mesmos da engine de volume (periodizacao.ts →
// GrupoMuscular), pra o gráfico de volume do Montador plugar direto na ciência
// (VOLUME_POR_GRUPO / classificarVolume) sem tradução extra.
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";

// Normaliza: minúsculas + remove acentos → regex fica simples e robusto.
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Ordem IMPORTA: regras mais específicas primeiro.
const REGRAS: Array<[RegExp, GrupoMuscular]> = [
  [/panturrilha|gemeos|soleo|gastrocn/, "panturrilha"],
  [/gluteo|pelvica|hip ?thrust|abdutora|coice|bulgaro|elevacao pelvica/, "gluteo"],
  [/stiff|flexora|posterior|good ?morning|terra romeno/, "pernas"],
  [/agachament|leg ?press|extensora|hack|afundo|avanco|passada|cadeira extensora|adutora/, "pernas"],
  [/triceps|testa|frances|mergulho/, "triceps"],
  [/rosca|biceps|scott|martelo/, "biceps"],
  [/desenvolvimento|elevacao lateral|elevacao frontal|arnold|ombro|crucifixo invertido|encolhimento|trapezio|remada alta|face ?pull/, "ombros"],
  [/puxad|remad|barra fixa|pull ?down|costas|serrote|levantamento terra|\bterra\b/, "costas"],
  [/supino|crucifixo|crossover|cross ?over|peck|peitoral|flexao de braco|pullover|flexao\b/, "peito"],
  [/abdominal|abdomen|prancha|infra|obliquo|vacuo|russian|dead ?bug|elevacao de pernas/, "abdomen"],
  [/esteira|bike|ergometrica|corrida|cardio|hiit|eliptico|transport|escada|polichinelo|burpee|pular corda/, "cardio"],
];

/** Detecta o grupo muscular pelo nome do exercício. Sem match → "outro". */
export function detectarGrupo(nome: string): GrupoMuscular {
  if (!nome || !nome.trim()) return "outro";
  const n = norm(nome);
  for (const [rx, g] of REGRAS) {
    if (rx.test(n)) return g;
  }
  return "outro";
}

export const GRUPO_LABEL: Record<GrupoMuscular, string> = {
  peito: "Peito",
  costas: "Costas",
  pernas: "Pernas",
  gluteo: "Glúteo",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebraco: "Antebraço",
  abdomen: "Abdômen",
  core: "Core",
  panturrilha: "Panturrilha",
  cardio: "Cardio",
  full_body: "Full body",
  outro: "Outro",
};

export const GRUPO_COR: Record<GrupoMuscular, string> = {
  peito: "#EF4444",
  costas: "#3B82F6",
  pernas: "#2BD46B",
  gluteo: "#EC4899",
  ombros: "#F5B800",
  biceps: "#22D3EE",
  triceps: "#F97316",
  antebraco: "#A855F7",
  abdomen: "#84CC16",
  core: "#84CC16",
  panturrilha: "#94A3B8",
  cardio: "#64748B",
  full_body: "#A855F7",
  outro: "#6b6b72",
};

// Ciclo pra troca manual do grupo (clique na tag). Ordem prática pro personal.
export const GRUPOS_CICLO: GrupoMuscular[] = [
  "peito",
  "costas",
  "ombros",
  "pernas",
  "gluteo",
  "biceps",
  "triceps",
  "panturrilha",
  "abdomen",
  "core",
  "cardio",
  "outro",
];
