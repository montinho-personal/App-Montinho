// Tipos das tabelas adicionadas em 0003_features_expansion.sql

// Espelha o enum grupo_muscular (0003 + 0008). "pernas" é LEGADO ("a classificar").
export type GrupoMuscular =
  | "peito" | "costas" | "ombros" | "ombro_anterior" | "ombro_lateral" | "ombro_posterior"
  | "trapezio" | "biceps" | "triceps" | "antebraco"
  | "quadriceps" | "posteriores" | "gluteo" | "adutores" | "abdutores" | "panturrilha"
  | "abdomen" | "core" | "lombar"
  | "cardio" | "full_body" | "pernas" | "nao_classificado" | "outro";

export type Equipamento =
  | "barra" | "halter" | "maquina" | "polia" | "peso_corporal"
  | "cabo" | "kettlebell" | "elastico" | "esteira" | "bike"
  | "corda" | "banco" | "smith" | "outro";

export type VideoProvider = "cloudflare_stream" | "youtube" | "mux" | "direct_url";

export type ExercicioBiblioteca = {
  id: string;
  nome: string;
  slug: string;
  grupo_muscular: GrupoMuscular;
  grupos_secundarios: GrupoMuscular[];
  equipamento: Equipamento[];
  video_provider: VideoProvider | null;
  video_id: string | null;
  thumbnail_url: string | null;
  duracao_seg: number | null;
  descricao: string | null;
  instrucoes: string[];
  observacoes: string | null;
  dificuldade: number | null;
  arquivado: boolean;
  sinonimos?: string[];
  video_validado?: boolean;
  created_at: string;
  updated_at: string;
};

export type TemplateTreinoExercicio = {
  biblioteca_id: string;
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  descanso_seg: number | null;
};

export type TemplateTreinoEstrutura = Record<
  string, // letra A/B/C/D/E
  { nome: string; exercicios: TemplateTreinoExercicio[] }
>;

export type TemplateTreino = {
  id: string;
  nome: string;
  descricao: string | null;
  publico_alvo: string | null;
  numero_treinos: number;
  estrutura: TemplateTreinoEstrutura;
  uso_count: number;
  created_at: string;
  updated_at: string;
};

export type Anamnese = {
  id: string;
  aluno_id: string;
  objetivo_principal: string | null;
  prazo_meses: number | null;
  meta_peso_kg: number | null;
  ja_treinou: boolean | null;
  tempo_treino_meses: number | null;
  frequencia_semanal: number | null;
  lesoes: string | null;
  cirurgias: string | null;
  medicamentos: string | null;
  doencas_cronicas: string | null;
  dores_atuais: string | null;
  onde_treina: string | null;
  equipamentos_disponiveis: Equipamento[];
  horas_sono: number | null;
  consome_alcool: string | null;
  fuma: boolean | null;
  estresse_nivel: number | null;
  aceita_termos: boolean;
  assinado_em: string | null;
  created_at: string;
  updated_at: string;
};

export type FotoTipo = "frente" | "lado" | "costas" | "pose" | "confronto" | "outro";

export type Foto = {
  id: string;
  aluno_id: string;
  data: string;
  url: string;
  tipo: FotoTipo;
  observacoes: string | null;
  created_at: string;
};

export type SolicitacaoTipo = "foto" | "questionario" | "medida" | "exame";

export type Solicitacao = {
  id: string;
  aluno_id: string;
  tipo: SolicitacaoTipo;
  titulo: string;
  descricao: string | null;
  recorrencia_dias: number | null; // null = envio único
  proxima_em: string; // date (YYYY-MM-DD) do próximo disparo
  ultima_em: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type CheckIn = {
  id: string;
  aluno_id: string;
  data: string;
  energia: number | null;
  sono: number | null;
  dor: number | null;
  motivacao: number | null;
  estresse: number | null;
  notas: string | null;
  created_at: string;
};

export type MensagemTipo = "texto" | "imagem" | "audio" | "sistema";

export type Mensagem = {
  id: string;
  aluno_id: string;
  remetente_id: string;
  tipo: MensagemTipo;
  conteudo: string;
  anexo_url: string | null;
  lida_em: string | null;
  created_at: string;
};

export type AvaliacaoFisica = {
  id: string;
  aluno_id: string;
  agendada_para: string;
  realizada: boolean;
  evolucao_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type ConhecimentoTipo =
  | "livro" | "curso" | "paper" | "video" | "transcricao"
  | "aula" | "apostila" | "outro";

export type Conhecimento = {
  id: string;
  titulo: string;
  autores: string[];
  tipo: ConhecimentoTipo;
  ano: number | null;
  descricao: string | null;
  arquivo_url: string | null;
  link_externo: string | null;
  transcricao: string | null;
  tags: string[];
  citacao_apa: string | null;
  paginas: number | null;
  duracao_seg: number | null;
  arquivado: boolean;
  destaque: boolean;
  created_at: string;
  updated_at: string;
};
