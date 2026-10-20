// Montinho Desbloqueia — tipos do conteúdo educativo.

export type CategoriaConhecimento = "musculacao" | "emagrecimento" | "nutricao" | "recuperacao" | "consistencia";
export const CATEGORIAS: Array<{ id: CategoriaConhecimento; rotulo: string; cor: string }> = [
  { id: "musculacao", rotulo: "Musculação", cor: "#ba9e50" },
  { id: "emagrecimento", rotulo: "Emagrecimento", cor: "#c9785a" },
  { id: "nutricao", rotulo: "Nutrição", cor: "#7aa36a" },
  { id: "recuperacao", rotulo: "Recuperação", cor: "#6f8fb3" },
  { id: "consistencia", rotulo: "Consistência", cor: "#a58bc4" },
];

export type TipoQuiz = "mito_verdade" | "mito_verdade_depende" | "multipla";
export type StatusEditorial = "rascunho" | "em_revisao" | "publicado" | "arquivado";

/** Momentos do treino em que uma explicação pode ajudar (Caminho B). */
export const CONTEXTOS = ["mais_reps", "recorde", "reps_altas", "descanso", "treino_reduzido", "meta_semanal", "sem_aumento_carga"] as const;
export type ContextoConhecimento = (typeof CONTEXTOS)[number];

export type ConteudoConhecimento = {
  /** Identificador estável (ex.: "d01"). Nunca muda, mesmo com novas versões. */
  id: string;
  numero: number;
  categoria: CategoriaConhecimento;
  titulo: string;
  pergunta: string;
  tipo: TipoQuiz;
  alternativas: Array<{ id: string; texto: string }>;
  correta: string;
  /** Rótulo da resposta (ex.: "MITO", "VERDADE, COM CONTEXTO"). */
  veredito: string;
  /** Nível 1 — resposta rápida (15–30 s). */
  rapida: string;
  pratica: string;
  /** Nível 2 — entenda melhor (1–2 min). */
  detalhada: string;
  exemplo: string;
  fatores: string[];
  /** Nível 3 — a ciência por trás (opcional). */
  ciencia: string;
  limitacoes: string;
  quandoMuda: string;
  /** IDs de FONTES verificadas. Vazio = sem fonte específica verificada (o texto diz isso). */
  fontes: string[];
  gatilhos: { conquistas: string[]; contexto: ContextoConhecimento[] };
  /** Orientação de segurança/saúde: nunca fica bloqueada. */
  essencial?: boolean;
  status: StatusEditorial;
  versao: number;
  ordem?: number;
  /** Personal: conteúdo criado no painel (não faz parte da base inicial). */
  personalizado?: boolean;
};
