// Tipos das tabelas adicionadas em 0003_features_expansion.sql

// Espelha o enum grupo_muscular (0003 + 0008). "pernas" é LEGADO ("a classificar").
export type GrupoMuscular =
  | "peito" | "costas" | "ombros" | "ombro_anterior" | "ombro_lateral" | "ombro_posterior"
  | "trapezio" | "biceps" | "triceps" | "antebraco"
  | "quadriceps" | "posteriores" | "gluteo" | "adutores" | "abdutores" | "panturrilha"
  | "abdomen" | "abdomen_supra" | "abdomen_infra" | "core" | "lombar"
  | "cardio" | "full_body" | "pernas" | "nao_classificado" | "outro";

export type Equipamento =
  | "barra" | "halter" | "maquina" | "polia" | "peso_corporal"
  | "cabo" | "kettlebell" | "elastico" | "esteira" | "bike"
  | "corda" | "banco" | "smith" | "outro"
  | "barra_fixa" | "paralelas" | "anilha" | "barra_w" | "trx" | "bola" | "roda" | "caneleira";

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
  /** 0096 — Montinho Pulso (respostas do cardápio de src/lib/pulso/perguntas.ts). */
  origem?: "diario" | "pulso";
  pulso_energia?: string | null;
  pulso_recuperacao?: string | null;
  pulso_motivacao?: string | null;
  pulso_sono?: string | null;
  pulso_dificuldades?: string[] | null;
  pulso_pulou?: boolean;
  sessao_id?: string | null;
  respondido_em?: string | null;
};

/** 0096 — consentimento do Pulso para dado de saúde (corpo e sono). */
export type PulsoPreferencias = {
  aluno_id: string;
  consentimento_saude_em: string | null;
  consentimento_revogado_em: string | null;
  compartilhar_tendencias: boolean;
  updated_at: string;
};

/** 0096 — o que o personal fez com um alerta (evita repetir o mesmo alerta). */
export type AcompanhamentoAlerta = {
  id: string;
  aluno_id: string;
  origem: "pulso" | "aderencia" | "cardio";
  chave: string;
  estado: "acompanhado" | "dispensado" | "adiado";
  adiado_ate: string | null;
  nota: string | null;
  autor_id: string | null;
  created_at: string;
  updated_at: string;
};

/** 0098 — Montinho Cardio. */
export type ModalidadeCardio = "caminhada" | "corrida" | "esteira" | "bike_ergometrica" | "bike" | "eliptico" | "escada" | "remo" | "natacao" | "corda" | "hiit" | "outro";
export type IntensidadeCardio = "leve" | "moderada" | "forte";
/** Na prescrição, “livre” = o aluno escolhe a modalidade e marca qual fez. */
export type ModalidadePrescricao = ModalidadeCardio | "livre";

export type CardioPrescricao = {
  id: string;
  aluno_id: string;
  modalidade: ModalidadePrescricao;
  nome: string | null;
  tipo: "continuo" | "intervalado";
  duracao_min: number;
  intensidade: IntensidadeCardio;
  frequencia_semanal: number;
  /** Meta da semana em minutos (ex.: 120 em 5 dias); null = vezes × duração. */
  minutos_semana?: number | null;
  /** 'proprio' = montado pelo visitante. */
  autoria?: "personal" | "proprio";
  /** 0 = domingo … 6 = sábado. */
  dias: number[];
  vinculo: "qualquer" | "independente" | "apos_treino" | "antes_treino";
  treino_id: string | null;
  fc_alvo_min: number | null;
  fc_alvo_max: number | null;
  intervalos: string | null;
  observacoes: string | null;
  ativo: boolean;
  desativado_em: string | null;
  autor_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CardioRegistro = {
  id: string;
  aluno_id: string;
  prescricao_id: string | null;
  modalidade: ModalidadeCardio;
  status: "concluido" | "parcial" | "nao_realizado";
  duracao_min: number;
  planejado_min: number | null;
  intensidade_planejada: IntensidadeCardio | null;
  intensidade: IntensidadeCardio | null;
  esforco: number | null;
  distancia_km: number | null;
  velocidade_kmh: number | null;
  inclinacao_pct: number | null;
  fc_media: number | null;
  fc_max: number | null;
  observacoes: string | null;
  session_id: string | null;
  origem: "app" | "personal";
  client_key: string;
  data: string;
  realizado_em: string;
  /** Início do cronômetro no app (hora do servidor, 0113); null = anotado sem começar no app. */
  inicio_id?: string | null;
  iniciado_em?: string | null;
  removido_em: string | null;
  created_at: string;
  updated_at: string;
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

// 0115 — Conquistas da Tribo -------------------------------------------------
export type TriboMarco = { trilha: "cardio" | "treinos"; marco: number; nome: string };
export type TriboMissao = { id: string; serie_id: string; nome: string; descricao: string | null; meta_minutos: number | null; meta_treinos: number | null; inicio: string; fim: string; recorrente: boolean; ativa: boolean; criada_por: string | null; created_at: string };
export type TriboConquista = { id: string; aluno_id: string; codigo: string; referencia: string; metodo: "participacao" | "recuperacao" | "missao"; conquistado_em: string; dados: Record<string, unknown>; vista_em: string | null; created_at: string };

// 0130 — Ofertas dos planos ---------------------------------------------------
export type OfertaConfigId = "pacote_alunos" | "consultoria_visitantes" | "pacote_visitantes";
export type OfertaConfig = { id: OfertaConfigId; ativo: boolean; promo: string | null; updated_at: string };
