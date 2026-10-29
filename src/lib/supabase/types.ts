// Tipos das tabelas do Supabase — espelham 0001_initial_schema.sql
// Após aplicar o schema, rode `supabase gen types typescript` pra atualizar.

export type UserRole = "treinador" | "aluno";
export type AlunoStatus = "ativo" | "pendente" | "inadimplente" | "pausado" | "arquivado";
export type PagamentoStatus = "pendente" | "pago" | "atrasado" | "cancelado" | "falhou";
export type PagamentoMetodo = "pix" | "credito" | "debito" | "recorrente";
export type TreinoLetra = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type Sexo = "M" | "F" | "NI";

export type Profile = {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Aluno = {
  id: string;
  profile_id: string;
  telefone: string | null;
  data_nascimento: string | null;
  sexo: Sexo | null;
  altura_cm: number | null;
  objetivo: string | null;
  observacoes: string | null;
  status: AlunoStatus;
  data_inicio: string | null;
  acesso_ate: string | null;
  ultimo_treino_em: string | null;
  /** 'consultoria' (padrão) ou 'visitante' (0052). */
  modalidade?: "consultoria" | "visitante";
  /** 0076: aparece (para os outros alunos) no ranking de troféus. */
  ranking_visivel?: boolean;
  created_at: string;
  updated_at: string;
};

export type Treino = {
  id: string;
  aluno_id: string;
  letra: TreinoLetra;
  nome: string;
  observacoes: string | null;
  ordem: number;
  ativo: boolean;
  versao?: number;
  programa_id?: string | null;
  duracao_estimada_min?: number | null;
  /** Parâmetros de tempo do treino (descansos, s/rep, transição…); ver src/lib/tempo/estimar.ts. */
  tempos?: Record<string, unknown> | null;
  tempo_alvo_min?: number | null;
  /** Parâmetros de tempo efetivos no salvamento (treinador + treino). */
  tempos_efetivos?: Record<string, unknown> | null;
  /** 'personal' (padrão) ou 'proprio' (montado pelo visitante, 0052). */
  autoria?: "personal" | "proprio";
  created_at: string;
  updated_at: string;
};

export type Exercicio = {
  id: string;
  treino_id: string;
  ordem: number;
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  descanso_seg: number | null;
  observacoes: string | null;
  video_url: string | null;
  created_at: string;
};

export type Cronograma = {
  id: string;
  aluno_id: string;
  dia_semana: number; // 0-6 (dom-sab)
  treino_id: string | null;
  descanso: boolean;
};

export type Logbook = {
  id: string;
  aluno_id: string;
  exercicio_id: string;
  data: string;
  serie: number;
  carga_kg: number | null;
  reps: number | null;
  ie: number | null;
  observacoes: string | null;
  created_at: string;
};

export type Evolucao = {
  id: string;
  aluno_id: string;
  data: string;
  peso_kg: number | null;
  gordura_pct: number | null;
  cintura_cm: number | null;
  quadril_cm: number | null;
  braco_cm: number | null;
  coxa_cm: number | null;
  peito_cm: number | null;
  /** 0078: bioimpedância / avaliação e quem registrou. */
  altura_cm?: number | null;
  massa_muscular_kg?: number | null;
  massa_magra_kg?: number | null;
  gordura_visceral?: number | null;
  agua_pct?: number | null;
  abdomen_cm?: number | null;
  panturrilha_cm?: number | null;
  origem?: "aluno" | "personal" | "importado";
  /** 0125: medidas sem campo próprio (ex.: braço esquerdo, dobras cutâneas), lidas do arquivo da avaliação. */
  extras?: Array<{ nome: string; valor: number; unidade: string }> | null;
  observacoes: string | null;
  created_at: string;
};

/** 0078: arquivo de avaliação (PDF/foto/print) no armazenamento privado. */
export type AvaliacaoArquivo = { id: string; aluno_id: string; caminho: string; nome_original: string; tipo_mime: string; tamanho_bytes: number; data_avaliacao: string; descricao: string | null; evolucao_id: string | null; created_at: string };

export type AlimentoItem = {
  nome: string;
  quantidade: string;
  unidade?: string;
};

export type Dieta = {
  id: string;
  aluno_id: string;
  refeicao: string;
  ordem: number;
  horario: string | null;
  alimentos: AlimentoItem[];
  substituicoes: AlimentoItem[];
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type Foto = {
  id: string;
  aluno_id: string;
  data: string;
  url: string;
  tipo: "frente" | "lado" | "costas" | "outro" | null;
  observacoes: string | null;
  created_at: string;
};

export type Pagamento = {
  id: string;
  aluno_id: string;
  order_nsu: string;
  invoice_slug: string | null;
  transaction_nsu: string | null;
  valor_centavos: number;
  metodo: PagamentoMetodo | null;
  status: PagamentoStatus;
  checkout_url: string | null;
  receipt_url: string | null;
  vencimento: string | null;
  pago_em: string | null;
  raw_webhook: unknown;
  created_at: string;
  updated_at: string;
};

// Modo Visitante (0052)
export type Convite = {
  id: string;
  codigo: string;
  campanha_id: string | null;
  tipo_acesso: "permanente" | "dias" | "ate_data";
  dias: number | null;
  acesso_ate: string | null;
  max_usos: number | null;
  usos: number;
  valido_ate: string | null;
  renovavel: boolean;
  permite_conversao: boolean;
  origem: string | null;
  ativo: boolean;
  created_at: string;
  /** 0068: link pessoal de “convide um amigo” (AMIGO-XXXXX) do visitante. */
  indicador_aluno_id?: string | null;
};

/** 0068: amigo que entrou pelo link de um visitante (+10 dias, até +30). */
export type Indicacao = { id: string; indicador_aluno_id: string; indicado_aluno_id: string; dias_bonus: number; created_at: string };
/** 0070: como o aluno anota o peso (anilhas/halteres). */
export type PreferenciasCarga = { aluno_id: string; anilhas: "total" | "por_lado" | null; halteres: "total" | "por_lado" | null; atualizado_em: string };

export type AcessoVisitante = {
  aluno_id: string;
  convite_id: string | null;
  campanha_id: string | null;
  tipo: "permanente" | "dias" | "ate_data";
  inicio: string;
  fim: string | null;
  recursos: Record<string, unknown>;
  renovavel: boolean;
  origem: string | null;
};

export type PerfilVisitante = {
  aluno_id: string;
  objetivo: "hipertrofia" | "emagrecimento" | "condicionamento" | "saude" | "forca" | "outro" | null;
  experiencia: "iniciante" | "intermediario" | "avancado" | null;
  frequencia_semanal: number | null;
  local_treino: "academia" | "casa" | "condominio" | "outro" | null;
  minutos_por_treino: number | null;
  dificuldades: string[];
  interesse_desafios: boolean | null;
  onboarding_concluido_em: string | null;
  aceite_privacidade_em: string | null;
};
