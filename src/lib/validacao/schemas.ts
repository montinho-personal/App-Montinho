// Validação de entrada no servidor (zod). Mensagens em PT-BR.
import { z } from "zod";

export const GRUPOS = [
  "peito", "costas", "ombros", "ombro_anterior", "ombro_lateral", "ombro_posterior", "trapezio",
  "biceps", "triceps", "antebraco", "quadriceps", "posteriores", "gluteo", "adutores", "abdutores",
  "panturrilha", "abdomen", "core", "lombar", "cardio", "full_body", "pernas", "nao_classificado", "outro",
] as const;

export const TECNICAS = ["normal", "superset", "biset", "dropset", "rest_pause", "cluster", "piramide", "isometria", "unilateral", "myo_reps"] as const;
export const LETRAS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

const texto = (max: number) => z.string().trim().max(max);
const textoOpcional = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));
const inteiro = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const inteiroOpcional = (min: number, max: number) => z.coerce.number().int().min(min).max(max).nullable().optional().transform((v) => (v == null || Number.isNaN(v) ? null : v));

export const exercicioInputSchema = z.object({
  id: z.string().max(64).nullable().optional(),
  nome: texto(120).min(1, "Nome do exercício é obrigatório"),
  series: inteiro(0, 30),
  reps: texto(60).default(""),
  ie: inteiroOpcional(0, 10),
  rir: inteiroOpcional(0, 10),
  descanso_seg: inteiroOpcional(0, 1800),
  observacoes: textoOpcional(500),
  series_config: z.unknown().optional(),
  biblioteca_id: z.string().max(64).nullable().optional(),
  grupo_muscular: z.enum(GRUPOS).nullable().optional().default(null),
  grupos_secundarios: z.array(z.enum(GRUPOS)).max(6).default([]),
  grupo_origem: z.enum(["biblioteca", "manual", "heuristica", "correcao"]).nullable().optional().default(null),
  grupo_confianca: z.enum(["alta", "media", "baixa"]).nullable().optional().default(null),
  series_aquecimento: inteiro(0, 10).default(0),
  tecnica: z.enum(TECNICAS).default("normal"),
  tecnica_extras: inteiroOpcional(0, 10),
  tecnica_series: inteiroOpcional(0, 20),
  descanso_apos_seg: inteiroOpcional(0, 900),
  cadencia: textoOpcional(12),
  prioridade: z.enum(["essencial", "normal", "adiavel"]).default("normal"),
  bloco: textoOpcional(20),
  unilateral: z.boolean().default(false),
  carga_alvo: textoOpcional(40),
  conta_volume: z.boolean().default(true),
});

export const treinoInputSchema = z.object({
  id: z.string().max(64).nullable().optional(),
  letra: z.enum(LETRAS),
  nome: texto(80).min(1),
  ativo: z.boolean().default(true),
  observacoes: textoOpcional(500),
  duracao_estimada_min: inteiroOpcional(5, 300),
  tempo_alvo_min: inteiroOpcional(5, 300),
  tempos: z.record(z.string(), z.union([z.number().min(0).max(900), z.boolean()])).optional(),
  tempos_efetivos: z.record(z.string(), z.union([z.number().min(0).max(1800), z.boolean()])).optional(),
  exercicios: z.array(exercicioInputSchema).max(40),
});

export const metaSchema = z.object({ min: z.coerce.number().min(0).max(60), max: z.coerce.number().min(0).max(80) });

export const calendarioSchema = z.union([
  z.object({ modo: z.literal("fixa"), dias: z.array(z.object({ dia: inteiro(0, 6), letra: z.enum(LETRAS).nullable() })).max(7) }),
  z.object({ modo: z.literal("rotativo"), sequencia: z.array(z.enum(LETRAS)).min(1).max(14), diasPorSemana: inteiro(1, 7) }),
  z.object({}).strict(),
]);

export const programaInputSchema = z.object({
  nome: texto(80).default("Programa atual"),
  objetivo: textoOpcional(40),
  nivel: textoOpcional(40),
  split: textoOpcional(40),
  modo_semana: z.enum(["fixa", "rotativo"]).default("fixa"),
  frequencia: z.partialRecord(z.enum(LETRAS), z.coerce.number().min(0).max(7)).default({}),
  calendario: calendarioSchema.default({}),
  metas_volume: z.partialRecord(z.enum(GRUPOS), metaSchema).default({}),
  prioridades: z.array(z.string().max(30)).max(6).default([]),
  equipamentos: z.array(z.string().max(30)).max(20).default([]),
  duracao_min: inteiroOpcional(10, 240),
  permite_versao_reduzida: z.boolean().default(false),
  observacoes: textoOpcional(1000),
});

export const salvarPlanoSchema = z.object({
  programa: programaInputSchema,
  treinos: z.array(treinoInputSchema).min(1).max(8),
  motivo: textoOpcional(300),
  volume: z.unknown().optional(),
  correcoes: z
    .array(z.object({ nome: texto(120), grupo: z.enum(GRUPOS), secundarios: z.array(z.enum(GRUPOS)).max(6).default([]) }))
    .max(100)
    .optional(),
});

export const CHECKIN_PRE = ["muito_bem", "normal", "cansado", "desconforto", "prefiro_nao"] as const;

export const iniciarSessaoSchema = z.object({
  treino_id: z.string().min(1).max(64),
  client_key: z.string().min(8).max(80),
  checkin_pre: z.enum(CHECKIN_PRE).nullable().optional(),
  checkin_pre_nota: textoOpcional(300),
  tempo_disponivel_min: z.coerce.number().int().min(10).max(240).nullable().optional(),
  extra_id: z.string().min(1).max(64).nullable().optional(),
  recuperacao: z.enum(["bem", "cansado", "dor", "prefiro_nao"]).nullable().optional(),
});

export const serieSchema = z.object({
  session_exercise_id: z.string().min(1).max(64),
  client_key: z.string().min(4).max(80),
  serie: inteiro(1, 50),
  tipo: z.enum(["valida", "aquecimento", "dropset", "rest_pause", "cluster", "isometria"]).default("valida"),
  carga_kg: z.coerce.number().min(0).max(1000).nullable().optional(),
  reps: inteiroOpcional(0, 500),
  rir: inteiroOpcional(0, 10),
  rpe: z.coerce.number().min(0).max(10).nullable().optional(),
  tempo_seg: inteiroOpcional(0, 7200),
  lado: z.enum(["direito", "esquerdo", "ambos"]).nullable().optional(),
  desconforto: inteiroOpcional(0, 10),
  observacoes: textoOpcional(300),
  concluida_em: z.string().datetime({ offset: true }).optional(),
});

export const finalizarSessaoSchema = z.object({
  status: z.enum(["concluida", "abandonada"]).default("concluida"),
  feedback_percepcao: z.enum(["leve", "ok", "pesado", "dor"]).nullable().optional(),
  feedback_comentario: textoOpcional(500),
  duracao_seg: inteiroOpcional(0, 36000),
  pausado_seg: inteiroOpcional(0, 36000),
});

export const exercicioSessaoPatchSchema = z.object({
  status: z.enum(["pendente", "concluido", "pulado", "nao_consegui"]).optional(),
  observacao_aluno: textoOpcional(300),
});

export const adaptacaoSchema = z.object({
  session_id: z.string().max(64).nullable().optional(),
  session_exercise_id: z.string().max(64).nullable().optional(),
  exercicio_id: z.string().max(64).nullable().optional(),
  exercicio_nome: textoOpcional(120),
  motivo: z.enum(["nao_consegui", "desconforto", "sem_equipamento", "sem_tempo", "outro"]),
  descricao: textoOpcional(500),
});

export const responderAdaptacaoSchema = z.object({
  resposta: texto(1000).min(1),
  status: z.enum(["respondida", "resolvida"]).default("respondida"),
});

export const intervencaoSchema = z.object({
  tipo: z.enum(["nota", "revisao_treino", "ajuste_programa", "mensagem", "decisao"]),
  titulo: textoOpcional(120),
  descricao: texto(2000).min(1),
  visivel_aluno: z.boolean().default(false),
});

export const memoriaPatchSchema = z.object({
  feedback: z.enum(["util", "nao_util", "usei_adaptei"]).optional(),
  desfazer: z.boolean().optional(),
  favorito: z.boolean().optional(),
  justificativa: textoOpcional(500),
  nome: texto(120).min(1).optional(),
  tags: z.array(z.string().max(30)).max(12).optional(),
});

export const buscaMemoriaSchema = z.object({
  q: textoOpcional(200),
  dias: inteiroOpcional(1, 7),
  objetivo: textoOpcional(40),
  nivel: textoOpcional(40),
  split: textoOpcional(40),
  prioridades: z.array(z.string().max(30)).max(6).optional(),
  equipamentos: z.array(z.string().max(30)).max(20).optional(),
  restricoes: z.array(z.string().max(60)).max(20).optional(),
  duracao_min: inteiroOpcional(10, 240),
  favoritos: z.boolean().optional(),
});

/** Lê JSON e valida; devolve erro 400 legível quando inválido. */
// ---------------------------------------------------------------------------
// Biblioteca de exercícios
// ---------------------------------------------------------------------------
export const EQUIPAMENTOS = [
  "barra", "halter", "maquina", "polia", "peso_corporal", "cabo", "kettlebell", "elastico", "esteira", "bike",
  "corda", "banco", "smith", "outro", "barra_fixa", "paralelas", "anilha", "barra_w", "trx", "bola", "roda", "caneleira",
] as const;
export const PADROES = [
  "empurrar_horizontal", "empurrar_inclinado", "empurrar_vertical", "aducao_horizontal", "puxar_vertical", "puxar_horizontal",
  "extensao_ombro", "abducao_ombro", "flexao_ombro", "abducao_horizontal", "rotacao_externa", "elevacao_escapular",
  "flexao_cotovelo", "extensao_cotovelo", "agachar", "avanco", "extensao_joelho", "dobradica_quadril", "flexao_joelho",
  "extensao_quadril", "abducao_quadril", "aducao_quadril", "flexao_plantar", "flexao_tronco", "flexao_quadril",
  "rotacao_tronco", "antiextensao", "antiflexao_lateral", "antirrotacao", "extensao_tronco", "flexao_punho", "extensao_punho", "carregamento",
] as const;

export const exercicioBibliotecaSchema = z.object({
  nome: texto(120).min(2, "Informe o nome do exercício"),
  sinonimos: z.array(texto(80).min(1)).max(20).default([]),
  grupo_muscular: z.enum(GRUPOS),
  pesos_secundarios: z.partialRecord(z.enum(GRUPOS), z.coerce.number().gt(0).max(1)).default({}),
  padrao_movimento: z.enum(PADROES).nullable().optional().default(null),
  articulacoes: z.array(z.enum(["ombro", "escapula", "cotovelo", "punho", "coluna", "quadril", "joelho", "tornozelo"])).max(8).default([]),
  equipamento: z.array(z.enum(EQUIPAMENTOS)).max(8).default([]),
  tipo_movimento: z.enum(["multiarticular", "monoarticular"]).nullable().optional().default(null),
  nivel_minimo: z.enum(["iniciante", "intermediario", "avancado"]).nullable().optional().default(null),
  instrucoes: z.array(texto(240).min(1)).max(8).default([]),
  erros_comuns: z.array(texto(240).min(1)).max(8).default([]),
  campos_registro: z.array(z.enum(["carga", "repeticoes", "tempo", "distancia", "assistencia"])).min(1).max(5).default(["carga", "repeticoes"]),
  estresse_articular: z.array(z.enum(["joelho", "ombro", "lombar", "cotovelo_punho", "quadril"])).max(5).default([]),
  conta_volume: z.boolean().default(true),
  video_provider: z.enum(["youtube", "cloudflare_stream", "mux", "direct_url"]).nullable().optional().default(null),
  video_id: textoOpcional(300),
  video_validado: z.boolean().default(false),
});

export const favoritoSchema = z.object({ exercicio_id: z.string().min(1).max(64), favorito: z.boolean() });

export const equivalenciaSchema = z.object({
  exercicio_id: z.string().min(1).max(64),
  alternativa_id: z.string().min(1).max(64),
  status: z.enum(["sugerida", "aprovada", "rejeitada"]),
  nota: textoOpcional(300),
}).refine((v) => v.exercicio_id !== v.alternativa_id, { message: "Um exercício não substitui a si mesmo" });

export async function lerJson<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<{ data: z.infer<T>; error: null } | { data: null; error: { status: number; body: { error: string; detalhes?: unknown } } }> {
  const raw = await request.json().catch(() => null);
  if (raw === null || typeof raw !== "object") return { data: null, error: { status: 400, body: { error: "Corpo da requisição inválido" } } };
  const r = schema.safeParse(raw);
  if (!r.success) {
    const primeiro = r.error.issues[0];
    return { data: null, error: { status: 400, body: { error: `Dados inválidos: ${primeiro?.path.join(".") || "campo"} — ${primeiro?.message}`, detalhes: r.error.issues.slice(0, 5) } } };
  }
  return { data: r.data, error: null };
}

// Notificações push: inscrição do aparelho (Web Push padrão).
export const inscricaoPushSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(300), auth: z.string().min(8).max(100) }),
});

// Parâmetros de tempo (padrão do treinador ou de um treino), em segundos.
export const temposSchema = z
  .object({
    descansoEntreSeriesSeg: z.number().int().min(0).max(900),
    descansoAposExercicioSeg: z.number().int().min(0).max(900),
    segundosPorRep: z.number().min(0.5).max(15),
    transicaoSeg: z.number().int().min(0).max(600),
    transicaoDentroDoDescanso: z.boolean(),
    preparacaoInicialSeg: z.number().int().min(0).max(1800),
    descansoAquecimentoSeg: z.number().int().min(0).max(600),
  })
  .partial()
  .strict();

// Central de aderência
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)");
export const metaSemanalSchema = z.object({
  meta: z.coerce.number().int().min(1).max(7),
  vigente_desde: dataISO,
  observacao: textoOpcional(300),
});
export const TIPOS_PAUSA = ["ferias", "lesao", "descanso_prescrito", "viagem", "saude", "outro"] as const;
export const pausaSchema = z
  .object({ inicio: dataISO, fim: dataISO.nullable().optional(), tipo: z.enum(TIPOS_PAUSA).default("outro"), motivo: textoOpcional(300) })
  .refine((p) => !p.fim || p.fim >= p.inicio, { message: "O fim não pode ser antes do início", path: ["fim"] });
export const encerrarPausaSchema = z.object({ pausa_id: z.string().min(1).max(64), fim: dataISO });

// Meu Chalalá de hoje — eventos (sem conteúdo privado) e reconhecimento do personal
export const eventoChalalaSchema = z
  .object({
    tipo: z.enum(["conclusao_vista", "editor_aberto", "modelo_escolhido", "card_gerado", "download", "compartilhar_nativo", "compartilhar_cancelado", "vitrine_vista", "explicacao_aberta", "colecao_vista"]),
    modelo: z.string().regex(/^[A-Za-z]{1,20}$/).nullable().optional(),
    formato: z.enum(["stories", "feed", "quadrado"]).nullable().optional(),
    origem: z.enum(["conclusao", "historico", "mensal", "reconhecimento", "vitrine", "colecao", "medalha"]).nullable().optional(),
  })
  .strict();
export const reconhecimentoSchema = z.object({
  aluno_id: z.string().min(1).max(64),
  conquista_id: z.string().min(1).max(64).nullable().optional(),
  mensagem: z.string().trim().min(3, "Escreva a mensagem").max(600),
  notificar: z.boolean().optional(),
});

// Treino extra
export const MODALIDADES_EXTRA = ["cardio_leve", "cardio_moderado", "tecnica", "mobilidade", "atividade_geral", "complementar", "resistido"] as const;
const recuperacaoSchema = z.enum(["bem", "cansado", "dor", "prefiro_nao"]).nullable().optional();
export const configExtraSchema = z.object({
  habilitado: z.boolean(),
  requer_aprovacao: z.boolean(),
  max_por_semana: z.coerce.number().int().min(0).max(7),
  dias_permitidos: z.array(z.coerce.number().int().min(0).max(6)).max(7),
  limite_series_semana: z.coerce.number().int().min(0).max(60),
  intervalo_min_horas: z.coerce.number().int().min(0).max(72),
  observacao: textoOpcional(300),
});
export const extraLiberadoSchema = z.object({
  id: z.string().min(1).max(64).nullable().optional(),
  modalidade: z.enum(MODALIDADES_EXTRA),
  titulo: z.string().trim().min(1).max(80),
  descricao: textoOpcional(600),
  duracao_min: z.coerce.number().int().min(5).max(180),
  treino_id: z.string().min(1).max(64).nullable().optional(),
  grupos: z.array(z.enum(GRUPOS)).max(10).default([]),
  series_estimadas: z.coerce.number().int().min(0).max(40).default(0),
});
export const extraAtivoSchema = z.object({ id: z.string().min(1).max(64), ativo: z.boolean() });
export const avaliarExtraSchema = z.object({ recuperacao: recuperacaoSchema, tempo_disponivel_min: z.coerce.number().int().min(5).max(300).nullable().optional() });
export const solicitarExtraSchema = z.object({
  extra_id: z.string().min(1).max(64),
  client_key: z.string().min(8).max(80),
  recuperacao: recuperacaoSchema,
  tempo_disponivel_min: z.coerce.number().int().min(5).max(300).nullable().optional(),
  mensagem: textoOpcional(300),
});
export const decidirExtraSchema = z.object({ id: z.string().min(1).max(64), status: z.enum(["aprovada", "recusada"]), resposta: textoOpcional(300) });
export const registrarAtividadeExtraSchema = z.object({
  extra_id: z.string().min(1).max(64),
  client_key: z.string().min(8).max(80),
  duracao_min: z.coerce.number().int().min(1).max(300),
  recuperacao: recuperacaoSchema,
});

export const regrasAcompanhamentoSchema = z
  .object({
    diasSemTreino: z.coerce.number().int().min(3).max(60),
    quedaPontos: z.coerce.number().int().min(5).max(80),
    pausaParaRetomada: z.coerce.number().int().min(7).max(90),
    janelaRetomada: z.coerce.number().int().min(1).max(30),
    sequenciaReconhecer: z.coerce.number().int().min(2).max(26),
    horasRegistroAberto: z.coerce.number().int().min(2).max(72),
    diasPlanoAlterado: z.coerce.number().int().min(3).max(60),
  })
  .partial()
  .strict();

// Estratégia importada do Montinho Strategy (o mesmo formato de src/lib/estrategia/ler.ts).
const txt = (max: number) => z.string().trim().max(max).nullable();
const listaTxt = (max: number, n = 20) => z.array(z.string().trim().max(max)).max(n);
export const estrategiaSchema = z.object({
  versao: z.literal(1),
  aluno: txt(120),
  titulo: txt(160),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  objetivo: txt(200),
  objetivosSecundarios: txt(300),
  experiencia: txt(60),
  diasPorSemana: z.number().int().min(1).max(7).nullable(),
  minutosPorTreino: z.number().int().min(10).max(300).nullable(),
  prioridades: listaTxt(60, 12),
  comoPriorizar: listaTxt(200),
  divisao: txt(120),
  justificativaDivisao: txt(3000),
  adaptacoes: txt(3000),
  intensidade: txt(200),
  volume: z.array(z.object({ rotulo: z.string().trim().max(60), grupo: z.enum(GRUPOS).nullable(), series: z.number().int().min(0).max(60), max: z.number().int().min(0).max(80).nullable().optional() })).max(30),
  volumeTotal: z.number().int().min(0).max(500).nullable(),
  frequencia: txt(200),
  fases: z.array(z.object({ numero: z.number().int().min(1).max(20), nome: z.string().trim().max(80), semanas: z.number().int().min(1).max(52).nullable() })).max(12),
  preparacao: listaTxt(80),
  preparacaoMotivo: txt(2000),
  progressao: listaTxt(300),
  checkinSemanal: listaTxt(80),
  pontosFortes: listaTxt(400),
  pontosAtencao: listaTxt(600),
  frase: txt(400),
  logicaExercicios: listaTxt(600),
  aerobico: txt(400),
  encerramento: txt(3000),
  restricoes: txt(1000).optional(),
  exerciciosObrigatorios: txt(1000).optional(),
  exerciciosEvitar: txt(1000).optional(),
});
/** Cadastro que vem no arquivo do Strategy (só preenche o que vier preenchido). */
export const cadastroStrategySchema = z.object({
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  idade: z.number().int().min(5).max(110).nullable(),
  sexo: z.enum(["M", "F"]).nullable(),
  email: z.string().trim().toLowerCase().email().max(254).nullable(),
  whatsapp: z.string().regex(/^55\d{10,11}$/).nullable(),
});

export const salvarEstrategiaSchema = z.object({
  estrategia: estrategiaSchema,
  cadastro: cadastroStrategySchema.nullable().optional(),
  arquivo_nome: z.string().trim().max(200).nullable().optional(),
  criar_plano: z.boolean().default(true),
  /** Plano já existente: atualiza só as metas de séries (faixas) dos grupos do relatório. */
  atualizar_metas: z.boolean().default(true),
});
