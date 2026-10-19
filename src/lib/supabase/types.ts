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
  observacoes: string | null;
  created_at: string;
};

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
