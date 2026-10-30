// ============================================================================
// Montinho Multimodalidade (aprovado pelo Montinho em 30/10/2026; migração 0133).
// A modalidade é uma ETIQUETA do treino e da sessão — nunca da conta. O padrão
// é 'musculacao', então tudo o que já existe continua exatamente igual.
// “Cross Training” no app (CrossFit é marca registrada); HYROX só descreve o
// formato da prova.
// ============================================================================

export const MODALIDADES_TREINO = {
  musculacao: { nome: "Musculação", emoji: "🏋️", explica: "Séries, repetições e carga, como sempre." },
  cross: { nome: "Cross Training", emoji: "🔥", explica: "Blocos: aquecimento, técnica, força, WOD e volta à calma." },
  hyrox: { nome: "HYROX", emoji: "🏃", explica: "Corrida alternada com estações (trenó, remo, wall ball…)." },
  funcional: { nome: "Funcional", emoji: "🔁", explica: "Circuito de estações com tempo ou repetições." },
  hibrido: { nome: "Híbrido", emoji: "🧬", explica: "Blocos de modalidades diferentes na mesma sessão." },
} as const;
export type ModalidadeTreino = keyof typeof MODALIDADES_TREINO;
export const LISTA_MODALIDADES = Object.keys(MODALIDADES_TREINO) as ModalidadeTreino[];
export const ehMusculacao = (m: string | null | undefined) => !m || m === "musculacao";

export const TIPOS_BLOCO = {
  aquecimento: { nome: "Aquecimento", emoji: "🔥" },
  tecnica: { nome: "Técnica / habilidade", emoji: "🎯" },
  forca: { nome: "Força", emoji: "🏋️" },
  metcon: { nome: "WOD / Metcon", emoji: "⏱️" },
  volta_calma: { nome: "Volta à calma / mobilidade", emoji: "🧘" },
  corrida: { nome: "Corrida", emoji: "🏃" },
  estacao: { nome: "Estação", emoji: "🛷" },
  circuito: { nome: "Circuito", emoji: "🔁" },
} as const;
export type TipoBloco = keyof typeof TIPOS_BLOCO;

/** Formatos do bloco e os campos que cada um pede (nada além do necessário). */
export const FORMATOS = {
  amrap: { nome: "AMRAP", explica: "O máximo de rounds e repetições no tempo.", campos: ["minutos"] },
  emom: { nome: "EMOM", explica: "A cada minuto, no minuto: faz o combinado e descansa o resto.", campos: ["minutos", "intervalo_seg"] },
  intervalo: { nome: "Intervalado", explica: "Trabalho e descanso em blocos combinados (E2MOM, 40/20…).", campos: ["rounds", "trabalho_seg", "descanso_seg"] },
  for_time: { nome: "For Time", explica: "Fazer tudo o mais rápido possível, com tempo limite.", campos: ["time_cap_seg"] },
  rounds_for_time: { nome: "Rounds For Time", explica: "N rounds o mais rápido possível.", campos: ["rounds", "time_cap_seg"] },
  chipper: { nome: "Chipper", explica: "Uma lista longa, um movimento de cada vez, até o fim.", campos: ["time_cap_seg"] },
  tabata: { nome: "Tabata", explica: "20 s de esforço e 10 s de descanso, 8 vezes (ou o combinado).", campos: ["rounds", "trabalho_seg", "descanso_seg"] },
  death_by: { nome: "Death By", explica: "1 repetição no 1º minuto, 2 no 2º… até não completar.", campos: [] },
  ladder: { nome: "Ladder (escada)", explica: "As repetições sobem (ou descem) a cada round.", campos: ["time_cap_seg"] },
  livre: { nome: "Livre", explica: "Do jeito que o coach descrever.", campos: [] },
  hyrox: { nome: "Simulado HYROX", explica: "Corrida e estações em sequência, tempo de cada parte.", campos: [] },
  circuito: { nome: "Circuito", explica: "Estações com tempo ou repetições, N rounds.", campos: ["rounds", "trabalho_seg", "descanso_seg"] },
} as const;
export type Formato = keyof typeof FORMATOS;
export type CampoFormato = (typeof FORMATOS)[Formato]["campos"][number];

export type MovimentoBloco = {
  biblioteca_id?: string | null;
  nome: string;
  /** Texto do coach: “21-15-9”, “10”, “máx.”. */
  reps?: string | null;
  carga?: string | null;
  distancia_m?: number | null;
  calorias?: number | null;
  tempo_seg?: number | null;
  /** Versão adaptada (Scaled) deste movimento: “pull-up com elástico”. */
  scaled?: string | null;
};

export type BlocoTreino = {
  id: string;
  tipo: TipoBloco;
  titulo?: string | null;
  formato?: Formato | null;
  minutos?: number | null;
  intervalo_seg?: number | null;
  rounds?: number | null;
  time_cap_seg?: number | null;
  trabalho_seg?: number | null;
  descanso_seg?: number | null;
  /** “21-15-9”, “10 a 1”. */
  esquema?: string | null;
  movimentos: MovimentoBloco[];
  /** Texto livre (aquecimento, técnica, volta à calma, observações). */
  texto?: string | null;
  /** Benchmark de referência (slug), quando o WOD é um deles. */
  benchmark?: string | null;
};

export const CONDICOES = {
  rx: { nome: "RX", explica: "Como prescrito." },
  scaled: { nome: "Scaled", explica: "Versão adaptada pelo coach." },
  adaptado: { nome: "Adaptado", explica: "Ajustado para você hoje (dor, equipamento, nível)." },
} as const;
export type Condicao = keyof typeof CONDICOES;

export const LIMITES_BLOCOS = { maxBlocos: 12, maxMovimentos: 20 } as const;
