// Tipos das tabelas adicionadas em 0009_fundacao_sessoes_versoes.sql
// e das colunas novas em `exercicios`.

import type { Exercicio, TreinoLetra as TreinoLetraBase } from "./types";

import type { GrupoMuscular } from "./types-extended";
import type { Tecnica, Calendario, Frequencia, MetaVolume } from "@/lib/volume/calcular";

export type TreinoLetra = TreinoLetraBase;
export const LETRAS_TREINO: TreinoLetra[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

export type GrupoOrigem = "biblioteca" | "manual" | "heuristica" | "correcao";
export type Confianca = "alta" | "media" | "baixa";

/** Exercício prescrito com os metadados da 0009. */
export type ExercicioPrescrito = Exercicio & {
  biblioteca_id?: string | null;
  series_config?: unknown;
  grupo_muscular: GrupoMuscular | null;
  grupos_secundarios: GrupoMuscular[];
  grupo_origem: GrupoOrigem | null;
  grupo_confianca: Confianca | null;
  series_aquecimento: number;
  tecnica: Tecnica;
  /** Drops (drop set) ou mini-séries (rest-pause/myo-reps) por série; null = padrão. */
  tecnica_extras?: number | null;
  /** Em quantas séries válidas a técnica é aplicada; null = padrão. */
  tecnica_series?: number | null;
  bloco: string | null;
  unilateral: boolean;
  carga_alvo: string | null;
  rir: number | null;
  cadencia: string | null;
  conta_volume: boolean;
  removido_em: string | null;
  updated_at?: string;
};

export type Programa = {
  id: string;
  aluno_id: string;
  nome: string;
  objetivo: string | null;
  nivel: string | null;
  split: string | null;
  modo_semana: "fixa" | "rotativo";
  frequencia: Frequencia;
  calendario: Calendario | Record<string, never>;
  metas_volume: Partial<Record<GrupoMuscular, MetaVolume>>;
  prioridades: string[];
  equipamentos: string[];
  duracao_min: number | null;
  permite_versao_reduzida: boolean;
  observacoes: string | null;
  versao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type ProgramaVersao = {
  id: string;
  aluno_id: string;
  programa_id: string | null;
  versao: number;
  autor_id: string | null;
  motivo: string | null;
  snapshot: SnapshotPrograma;
  volume: unknown;
  diff_resumo: string | null;
  created_at: string;
};

export type SnapshotExercicio = {
  id: string;
  ordem: number;
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  rir: number | null;
  descanso_seg: number | null;
  observacoes: string | null;
  grupo_muscular: GrupoMuscular | null;
  grupos_secundarios: GrupoMuscular[];
  series_aquecimento: number;
  tecnica: Tecnica;
  tecnica_extras?: number | null;
  tecnica_series?: number | null;
  bloco: string | null;
  unilateral: boolean;
  carga_alvo: string | null;
  series_config?: unknown;
};

export type SnapshotTreino = {
  id: string;
  letra: TreinoLetra;
  nome: string;
  observacoes: string | null;
  ativo: boolean;
  exercicios: SnapshotExercicio[];
};

export type SnapshotPrograma = {
  programa: Pick<Programa, "nome" | "objetivo" | "nivel" | "split" | "modo_semana" | "frequencia" | "calendario" | "metas_volume" | "prioridades" | "equipamentos" | "duracao_min" | "observacoes">;
  treinos: SnapshotTreino[];
};

export type SessaoStatus = "em_andamento" | "concluida" | "abandonada";

export type TrainingSession = {
  id: string;
  aluno_id: string;
  treino_id: string | null;
  programa_versao_id: string | null;
  letra: TreinoLetra | null;
  nome_treino: string | null;
  client_key: string;
  status: SessaoStatus;
  iniciado_em: string;
  finalizado_em: string | null;
  duracao_seg: number | null;
  snapshot: unknown;
  series_planejadas: number;
  series_concluidas: number;
  feedback_percepcao: "leve" | "ok" | "pesado" | "dor" | null;
  feedback_comentario: string | null;
  origem: "app" | "legado_logbook" | "treinador";
  created_at: string;
  updated_at: string;
};

export type SessionExerciseStatus = "pendente" | "concluido" | "pulado" | "nao_consegui";

export type SessionExercise = {
  id: string;
  session_id: string;
  exercicio_id: string | null;
  biblioteca_id: string | null;
  client_key: string;
  ordem: number;
  nome: string;
  nome_normalizado?: string;
  grupo_muscular: GrupoMuscular | null;
  series_planejadas: number;
  prescricao: unknown;
  status: SessionExerciseStatus;
  observacao_aluno: string | null;
  created_at: string;
};

export type SerieTipo = "valida" | "aquecimento" | "dropset" | "rest_pause" | "cluster" | "isometria";

export type SessionSet = {
  id: string;
  session_id: string;
  session_exercise_id: string;
  client_key: string;
  serie: number;
  tipo: SerieTipo;
  carga_kg: number | null;
  reps: number | null;
  rir: number | null;
  rpe: number | null;
  tempo_seg: number | null;
  lado: "direito" | "esquerdo" | "ambos" | null;
  desconforto: number | null;
  observacoes: string | null;
  concluida_em: string;
  created_at: string;
};

export type Adaptacao = {
  id: string;
  aluno_id: string;
  session_id: string | null;
  session_exercise_id: string | null;
  exercicio_id: string | null;
  exercicio_nome: string | null;
  motivo: "nao_consegui" | "desconforto" | "sem_equipamento" | "sem_tempo" | "outro";
  descricao: string | null;
  status: "aberta" | "respondida" | "resolvida";
  resposta: string | null;
  respondido_por: string | null;
  respondido_em: string | null;
  created_at: string;
};

export type Intervencao = {
  id: string;
  aluno_id: string;
  autor_id: string;
  tipo: "nota" | "revisao_treino" | "ajuste_programa" | "mensagem" | "decisao" | "resposta_adaptacao";
  titulo: string | null;
  descricao: string;
  referencia: Record<string, unknown>;
  visivel_aluno: boolean;
  created_at: string;
  autor?: { nome: string } | null;
};

export type BibliotecaProgramaStatus = "criado" | "utilizado" | "revisado" | "favorito" | "arquivado";

export type BibliotecaPrograma = {
  id: string;
  origem_versao_id: string | null;
  hash_estrutura: string;
  nome: string;
  resumo: string | null;
  metadados: MetadadosPrograma;
  estrutura: SnapshotPrograma;
  volume: unknown;
  tags: string[];
  status: BibliotecaProgramaStatus;
  favorito: boolean;
  uso_count: number;
  feedback: { util: number; nao_util: number; usei_adaptei: number };
  justificativa: string | null;
  autor_id: string | null;
  excluido_em: string | null;
  created_at: string;
  updated_at: string;
};

/** Metadados estruturados e DESIDENTIFICADOS usados pela memória de prescrições. */
export type MetadadosPrograma = {
  objetivo: string | null;
  nivel: string | null;
  split: string | null;
  dias: number;
  sessoes_semana: number;
  duracao_min: number | null;
  equipamentos: string[];
  prioridades: string[];
  tecnicas: string[];
  restricoes: string[];
  grupos_principais: string[];
  total_series: number;
  exercicios_por_dia: number;
};

export type GrupoCorrecao = {
  nome_normalizado: string;
  grupo_muscular: GrupoMuscular;
  grupos_secundarios: GrupoMuscular[];
};
