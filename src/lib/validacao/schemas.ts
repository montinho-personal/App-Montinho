// Validação de entrada no servidor (zod). Mensagens em PT-BR.
import { z } from "zod";
import { MSG_WHATSAPP, whatsappBR } from "@/lib/visitante/whatsapp";

export const GRUPOS = [
  "peito", "costas", "ombros", "ombro_anterior", "ombro_lateral", "ombro_posterior", "trapezio",
  "biceps", "triceps", "antebraco", "quadriceps", "posteriores", "gluteo", "adutores", "abdutores",
  "panturrilha", "abdomen", "core", "lombar", "cardio", "full_body", "pernas", "nao_classificado", "outro",
] as const;

export const TECNICAS = ["normal", "superset", "biset", "dropset", "rest_pause", "cluster", "piramide", "isometria", "unilateral", "myo_reps", "piramide_decrescente", "triset", "combinado", "pre_exaustao", "tres_sete", "super_slow", "negativo"] as const;
export const LETRAS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

const texto = (max: number) => z.string().trim().max(max);
const textoOpcional = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));
const inteiro = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const inteiroOpcional = (min: number, max: number) => z.coerce.number().int().min(min).max(max).nullable().optional().transform((v) => (v == null || Number.isNaN(v) ? null : v));

/** 0040 — configuração das técnicas avançadas (limites em src/lib/treino/tecnica-config.ts). */
const cfgNum = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional();
export const tecnicaConfigSchema = z.object({
  aplicar: z.enum(["finalizacao", "principais"]).optional(),
  series: cfgNum(0, 6),
  repsAlvo: cfgNum(1, 100),
  reps: cfgNum(1, 60),
  blocos: cfgNum(0, 10),
  repsBloco: cfgNum(1, 20),
  reducaoPct: cfgNum(5, 50),
  pausaSeg: cfgNum(0, 120),
  descansoSeg: cfgNum(0, 600),
  descidaSeg: cfgNum(1, 15),
  subidaSeg: cfgNum(1, 15),
});

export const exercicioInputSchema = z.object({
  id: z.string().max(64).nullable().optional(),
  nome: texto(120).min(1, "Nome do exercício é obrigatório"),
  series: inteiro(0, 30),
  reps: texto(60).default(""),
  ie: inteiroOpcional(0, 10),
  rir: inteiroOpcional(0, 10),
  descanso_seg: inteiroOpcional(0, 1800),
  observacoes: textoOpcional(1500),
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
  tecnica_config: tecnicaConfigSchema.nullable().optional().default(null),
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
  fase: z.enum(["adaptacao", "intensificacao", "consolidacao"]).nullable().optional().default(null),
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
  descanso_reduzido: z.boolean().optional(),
  extra_id: z.string().min(1).max(64).nullable().optional(),
  recuperacao: z.enum(["bem", "cansado", "dor_leve", "dor_moderada", "dor", "prefiro_nao"]).nullable().optional(),
});

export const serieSchema = z.object({
  session_exercise_id: z.string().min(1).max(64),
  client_key: z.string().min(4).max(80),
  serie: inteiro(1, 50),
  tipo: z.enum(["valida", "aquecimento", "dropset", "rest_pause", "cluster", "isometria", "myo_reps", "tres_sete"]).default("valida"),
  blocos: z.array(z.object({ carga: z.number().min(0).max(2000).nullable(), reps: z.number().int().min(0).max(500).nullable() })).max(12).nullable().optional(),
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
  percepcao: z.enum(["muito_leve", "moderado", "pesado", "muito_pesado"]).nullable().optional(),
});

/** Troca de exercício pelo aluno (null = voltar ao original do plano). */
export const trocaExercicioSchema = z.object({
  biblioteca_id: z.string().min(1).max(64).nullable(),
  /** Só no modo demo (memória por instância): o exercício original, para validar a troca. */
  original: z.object({ nome: z.string().min(1).max(120), biblioteca_id: z.string().max(64).nullable() }).optional(),
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

/** Personal oculta (ou volta a mostrar) uma alternativa de troca só para um aluno. */
export const alternativaOcultaSchema = z.object({
  exercicio_id: z.string().min(1).max(64),
  alternativa_id: z.string().min(1).max(64),
  oculta: z.boolean(),
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

// Chalalá no celular — preferências e configuração geral (migração 0036)
export const FUSOS = ["America/Sao_Paulo", "America/Bahia", "America/Fortaleza", "America/Recife", "America/Belem", "America/Maceio", "America/Araguaina", "America/Manaus", "America/Cuiaba", "America/Campo_Grande", "America/Porto_Velho", "America/Boa_Vista", "America/Rio_Branco", "America/Noronha", "Europe/Lisbon"] as const;
const horaHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido");
export const preferenciasNotificacaoSchema = z
  .object({
    motivacionais: z.boolean(),
    bom_dia: z.boolean(),
    bom_dia_hora: horaHHMM.refine((h) => h >= "05:00" && h <= "11:00", "Escolha entre 05:00 e 11:00"),
    pos_treino: z.boolean(),
    lembrete_treino: z.boolean(),
    silencio_inicio: horaHHMM,
    silencio_fim: horaHHMM,
    fuso: z.enum(FUSOS),
  })
  .strict();
export const configChalalaSchema = z
  .object({
    chalala_ativo: z.boolean(),
    limite_diario: z.coerce.number().int().min(1).max(6),
    intervalo_minimo_min: z.coerce.number().int().min(0).max(240),
  })
  .strict();
export const aberturaNotificacaoSchema = z.object({ id: z.string().uuid() }).strict();

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
/** Chamada do troféu no lugar da ação (ao-alcance.ts#chamadaDaAcao). */
export const chamadaTrofeuSchema = z.object({
  acao: z.enum(["card_treino", "card_medalha", "descoberta", "indicar", "desafio", "strava", "relatorio", "medidas", "cardio"]),
  ref: z.string().regex(/^[a-z0-9_]{1,60}$/).optional(),
});

export const eventoChalalaSchema = z
  .object({
    tipo: z.enum(["conclusao_vista", "editor_aberto", "modelo_escolhido", "card_gerado", "download", "compartilhar_nativo", "compartilhar_cancelado", "vitrine_vista", "explicacao_aberta", "colecao_vista", "conhecimento_aberto", "quiz_respondido", "sugestao_vista", "sugestao_aberta", "descoberta_salva", "descoberta_compartilhada", "chalala_workout_started", "chalala_progression_shown", "chalala_reps_evolution_shown", "chalala_record_unlocked", "chalala_advanced_technique_shown", "chalala_workout_completed", "chalala_push_permission_granted", "chalala_push_permission_revoked", "chalala_vai_que_ta_facil"]),
    ref: z.string().regex(/^[A-Za-z0-9_:-]{1,80}$/).nullable().optional(),
    modelo: z.string().regex(/^[A-Za-z0-9-]{1,20}$/).nullable().optional(),
    formato: z.enum(["stories", "feed", "quadrado"]).nullable().optional(),
    origem: z.enum(["conclusao", "historico", "mensal", "reconhecimento", "vitrine", "colecao", "medalha", "album", "biblioteca", "treino", "fim_treino", "inicio", "conquistas", "personal", "contexto"]).nullable().optional(),
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
const recuperacaoSchema = z.enum(["bem", "cansado", "dor_leve", "dor_moderada", "dor", "prefiro_nao"]).nullable().optional();
export const configExtraSchema = z.object({
  habilitado: z.boolean(),
  requer_aprovacao: z.boolean(),
  aprovacao_so_intensos: z.boolean().optional().default(true),
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
  /** 0073: exercícios do extra pronto (o aluno registra série por série). */
  exercicios: z
    .array(z.object({ biblioteca_id: z.string().max(64).nullable().optional().transform((v) => v ?? null), nome: z.string().trim().min(1).max(80), series: z.coerce.number().int().min(1).max(5), reps: z.string().trim().min(1).max(20) }))
    .min(1)
    .max(8)
    .nullable()
    .optional(),
});
export const iniciarExtraAprovadoSchema = z.object({ extra_id: z.string().min(1).max(64), client_key: z.string().min(8).max(80), recuperacao: recuperacaoSchema });
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
/** Extra: "app" (as três respostas) ou "livre" (o aluno escolhe); iniciar=true começa a sessão. */
const baseMontar = { corpo: z.enum(["bem", "cansado", "dor_leve", "dor_moderada", "dor"]), iniciar: z.boolean().optional().default(false), client_key: z.string().min(8).max(80).optional() };
export const montarExtraSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("app"), foco: z.enum(["prioridade", "full_body", "pequenos"]), tempo_min: z.coerce.number().int().refine((n) => [15, 20, 30, 45, 60].includes(n), "Tempo inválido"), ...baseMontar }),
  z.object({
    modo: z.literal("livre"),
    itens: z.array(z.object({ biblioteca_id: z.string().max(64).nullable().optional(), nome: z.string().trim().min(1).max(80), series: z.coerce.number().int().min(1).max(5), reps: z.string().trim().max(20).default("10-12") })).min(1).max(8),
    ...baseMontar,
  }),
  z.object({ modo: z.literal("sorteio"), chave: z.string().trim().min(3).max(100).regex(/^[a-z0-9-]+:[A-F]$/).optional(), vistos: z.array(z.string().max(100)).max(200).optional().default([]), ...baseMontar }),
]);
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
    treinosSemCarga: z.coerce.number().int().min(2).max(10),
    diasAvaliacao: z.coerce.number().int().min(14).max(365),
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
  divisao: txt(600), // pode vir o plano da semana inteira (“Seg: … Ter: …”)
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

// Montinho Desbloqueia
const idConhecimento = z.string().regex(/^[a-z0-9][a-z0-9-]{1,19}$/, "Identificador inválido");
export const explorarConhecimentoSchema = z
  .object({ resposta: z.string().max(20).nullable().optional(), origem: z.enum(["conquista", "periodo", "personal", "contexto", "biblioteca"]).nullable().optional() })
  .strict();
export const salvarConhecimentoSchema = z.object({ salvo: z.boolean() }).strict();
export const recomendarConhecimentoSchema = z.object({ aluno_id: z.string().min(1).max(64) }).strict();
const textoLongo = (max: number) => z.string().trim().max(max);
export const conteudoConhecimentoSchema = z
  .object({
    id: idConhecimento,
    numero: z.number().int().min(1).max(999),
    categoria: z.enum(["musculacao", "emagrecimento", "nutricao", "recuperacao", "consistencia"]),
    titulo: z.string().trim().min(2, "Escreva o título").max(80),
    pergunta: z.string().trim().min(5, "Escreva a pergunta").max(200),
    tipo: z.enum(["mito_verdade", "mito_verdade_depende", "multipla"]),
    alternativas: z.array(z.object({ id: z.string().regex(/^[a-z0-9_]{1,20}$/), texto: z.string().trim().min(1).max(120) })).min(2).max(4),
    correta: z.string().min(1).max(20),
    veredito: z.string().trim().min(2).max(40),
    rapida: z.string().trim().min(10, "Escreva a resposta rápida").max(600),
    pratica: z.string().trim().min(5, "Escreva a aplicação prática").max(400),
    detalhada: textoLongo(2500),
    exemplo: textoLongo(800),
    fatores: z.array(z.string().trim().min(1).max(80)).max(10),
    ciencia: textoLongo(2500),
    limitacoes: textoLongo(800),
    quandoMuda: textoLongo(800),
    fontes: z.array(z.string().max(40)).max(10),
    gatilhos: z.object({ conquistas: z.array(z.string().max(40)).max(16), contexto: z.array(z.enum(["mais_reps", "recorde", "reps_altas", "descanso", "treino_reduzido", "meta_semanal", "sem_aumento_carga"])).max(7) }),
    essencial: z.boolean().optional(),
    ordem: z.number().int().min(0).max(10000).optional(),
  })
  .refine((c) => c.alternativas.some((a) => a.id === c.correta), { message: "A resposta correta precisa ser uma das alternativas", path: ["correta"] });
export const salvarConteudoConhecimentoSchema = z.object({ conteudo: conteudoConhecimentoSchema, status: z.enum(["rascunho", "em_revisao", "publicado", "arquivado"]) }).strict();
export const statusConhecimentoSchema = z.object({ status: z.enum(["rascunho", "em_revisao", "publicado", "arquivado"]) }).strict();
export const porqueExercicioSchema = z.object({ texto: z.string().trim().max(600, "Use no máximo 600 caracteres") }).strict();

// Modo Visitante (0052)
const whatsappCampo = z
  .string()
  .trim()
  .max(30)
  .refine((v) => whatsappBR(v) != null, MSG_WHATSAPP)
  .transform((v) => whatsappBR(v)!);

/** Visitante que entrou antes do WhatsApp obrigatório informa o número (0063). */
export const whatsappVisitanteSchema = z.object({ whatsapp: whatsappCampo });

export const cadastroVisitanteSchema = z.object({
  codigo: z.string().trim().min(4).max(40),
  nome: z.string().trim().min(2, "Digite seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  whatsapp: whatsappCampo,
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres").max(72),
  aceite_privacidade: z.literal(true, { message: "É preciso aceitar a política de privacidade" }),
});

export const conviteSchema = z
  .object({
    codigo: z.string().trim().min(4).max(32),
    tipo_acesso: z.enum(["permanente", "dias", "ate_data"]),
    dias: z.number().int().min(1).max(365).nullable().optional(),
    acesso_ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    max_usos: z.number().int().min(1).max(100000).nullable().optional(),
    valido_ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    origem: z.string().trim().max(60).nullable().optional(),
    campanha_id: z.string().uuid().nullable().optional(),
  })
  .refine((c) => c.tipo_acesso !== "dias" || c.dias != null, { message: "Informe quantos dias", path: ["dias"] })
  .refine((c) => c.tipo_acesso !== "ate_data" || c.acesso_ate, { message: "Informe a data final", path: ["acesso_ate"] });

export const conviteAtivoSchema = z.object({ ativo: z.boolean() });

export const perfilVisitanteSchema = z.object({
  objetivo: z.enum(["hipertrofia", "emagrecimento", "condicionamento", "saude", "forca", "outro"]),
  experiencia: z.enum(["iniciante", "intermediario", "avancado"]),
  frequencia_semanal: z.number().int().min(1).max(7),
  local_treino: z.enum(["academia", "casa", "condominio", "outro"]),
  minutos_por_treino: z.number().int().min(10).max(240),
  dificuldades: z.array(z.enum(["tempo", "constancia", "motivacao", "nao_sei_montar", "sem_resultado", "nao_sei_executar"])).max(6).default([]),
  interesse_desafios: z.boolean(),
});

export const acaoVisitanteSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("renovar"), dias: z.number().int().min(1).max(365) }),
  z.object({ acao: z.literal("encerrar") }),
  z.object({ acao: z.literal("converter") }),
  z.object({ acao: z.literal("whatsapp"), whatsapp: whatsappCampo }),
]);

// Modo Visitante, fase 3: treino montado pelo próprio visitante (0054)
export const treinoProprioSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  nome: z.string().trim().min(2, "Dê um nome ao treino").max(60),
  exercicios: z
    .array(
      z.object({
        id: z.string().max(64).nullable().optional(),
        /** Exercício da biblioteca… */
        biblioteca_id: z.string().min(1).max(80).nullable().optional(),
        /** …ou com o nome que a pessoa escolheu (fica fora do volume por músculo). */
        nome_livre: z.string().trim().min(2, "Dê um nome ao exercício").max(60).nullable().optional(),
        series: z.number().int().min(1).max(10),
        reps: z.string().trim().regex(/^\d{1,3}(-\d{1,3})?$/, "Repetições: use um número (10) ou faixa (8-12)"),
        descanso_seg: z.number().int().min(15).max(600),
        carga_kg: z.number().min(0).max(500).nullable().optional(),
      })
      .refine((e) => Boolean(e.biblioteca_id) !== Boolean(e.nome_livre), "Escolha um exercício da biblioteca ou escreva o nome dele")
    )
    .min(1, "Adicione pelo menos um exercício")
    .max(15, "Até 15 exercícios por treino"),
});
export type TreinoProprioInput = z.infer<typeof treinoProprioSchema>;

// Modo Visitante, fases 4/5: desafio (campanha com meta de treinos) (0055)
export const desafioSchema = z
  .object({
    nome: z.string().trim().min(2, "Dê um nome ao desafio").max(120),
    descricao: z.string().trim().max(500).nullable().optional(),
    inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de início inválida"),
    fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data final inválida"),
    meta_treinos: z.number().int().min(1).max(100),
  })
  .refine((d) => d.fim >= d.inicio, { message: "A data final precisa ser depois do início", path: ["fim"] });

// Modo Visitante, fase 6: eventos dos convites para o WhatsApp (0057)
export const ctaEventoSchema = z.object({
  cta: z.enum(["acesso_vencido", "acesso_vencendo", "desafio_concluido", "constancia", "evolucao", "montar_treino", "instagram", "oferta_desconto", "oferta_conversa", "oferta_feedback"]),
  tipo: z.enum(["exibido", "clicado", "dispensado"]),
  tela: z.enum(["aviso", "inicio", "evolucao", "meus_treinos", "jornada", "fim_treino", "comecar", "popup", "encerrado"]),
});

// Modo Visitante, fase 8: painel de leads e CRM (0058)
export const leadStatusSchema = z.object({
  status: z.enum(["novo", "em_conversa", "interessado", "sem_interesse", "virou_aluno"]),
  anotacao: z.string().trim().max(2000).nullable().optional(),
});
export const crmConfigSchema = z.object({
  webhook_url: z.string().trim().max(500).nullable(),
  ativo: z.boolean(),
});

/** Padrão de carga do aluno (0070): anilhas e halteres, total ou por lado. */
const modoCarga = z.enum(["total", "por_lado"]).nullable();
export const padraoCargaSchema = z
  .object({ anilhas: modoCarga.optional(), halteres: modoCarga.optional() })
  .strict()
  .refine((v) => v.anilhas !== undefined || v.halteres !== undefined, { message: "Escolha um padrão" });

/** Ranking de troféus (0076): aparecer ou não para os outros alunos. */
export const rankingVisivelSchema = z.object({ visivel: z.boolean() }).strict();

/** Medidas e avaliações (0078): todos os campos opcionais, dentro dos limites de CAMPOS_MEDIDA. */
const medida = (min: number, max: number) => z.coerce.number().min(min).max(max).nullable().optional();
export const medidasSchema = z
  .object({
    aluno_id: z.string().min(1).max(64),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    peso_kg: medida(20, 350),
    altura_cm: medida(100, 250),
    gordura_pct: medida(2, 75),
    massa_muscular_kg: medida(5, 150),
    massa_magra_kg: medida(10, 200),
    gordura_visceral: medida(1, 60),
    agua_pct: medida(20, 80),
    cintura_cm: medida(30, 250),
    abdomen_cm: medida(30, 250),
    quadril_cm: medida(40, 250),
    peito_cm: medida(40, 250),
    braco_cm: medida(10, 80),
    coxa_cm: medida(20, 120),
    panturrilha_cm: medida(15, 80),
    observacoes: textoOpcional(500),
  })
  .strict();
export const urlArquivoAvaliacaoSchema = z.object({
  aluno_id: z.string().min(1).max(64),
  tipo: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
  tamanho: z.coerce.number().int().min(1).max(15 * 1024 * 1024),
});
export const registrarArquivoAvaliacaoSchema = urlArquivoAvaliacaoSchema.extend({
  caminho: z.string().min(5).max(300),
  nome: z.string().trim().min(1).max(200),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descricao: textoOpcional(300),
});

// Visitante sobe o treino que já tem (0080): leitura pela IA e envio do arquivo ao personal.
export const lerTreinoArquivoSchema = z
  .object({
    tipo: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
    // Base64 de até ~3 MB (imagens chegam reduzidas pelo navegador).
    base64: z.string().min(100).max(4_300_000).regex(/^[A-Za-z0-9+/=]+$/, "Arquivo inválido"),
  })
  .strict();
const TIPOS_TREINO_ENVIADO = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const urlTreinoEnviadoSchema = z.object({ tipo: z.enum(TIPOS_TREINO_ENVIADO), tamanho: z.number().int().min(1).max(15_728_640) }).strict();
export const registrarTreinoEnviadoSchema = z
  .object({
    caminho: z.string().min(5).max(300),
    tipo: z.enum(TIPOS_TREINO_ENVIADO),
    tamanho: z.number().int().min(1).max(15_728_640),
    observacao: z.string().trim().max(500).nullable().optional(),
  })
  .strict();
export const resolverTreinoEnviadoSchema = z.object({ status: z.enum(["montado", "descartado"]) }).strict();

// “Monte com IA” e treinos prontos do visitante (gerador com base científica).
const parametrosPlanoSchema = z
  .object({
    nivel: z.enum(["iniciante", "intermediario", "avancado"]),
    dias: z.number().int().min(1).max(7),
    minutos: z.number().int().min(10).max(180),
    foco: z.enum(["geral", "gluteo", "pernas", "peito", "costas", "bracos", "ombros", "abdomen", "superiores"]),
    local: z.enum(["academia", "casa"]),
  })
  .strict();
export const entenderPedidoSchema = z
  .object({ texto: z.string().trim().min(3, "Conte o treino que você quer").max(600), ajuste: parametrosPlanoSchema.partial().optional() })
  .strict();
export const salvarPlanoVisitanteSchema = z
  .object({
    origem: z.discriminatedUnion("tipo", [
      z.object({ tipo: z.literal("pronto"), slug: z.string().regex(/^[a-z0-9-]{3,80}$/) }).strict(),
      z.object({ tipo: z.literal("pedido"), parametros: parametrosPlanoSchema, opcao: z.enum(["A", "B"]) }).strict(),
    ]),
    substituir: z.boolean(),
  })
  .strict();

// Ditado inteligente com IA (personal, aluno e visitante).
export const ditadoIASchema = z.object({ fala: z.string().trim().min(3).max(4000) }).strict();

// Treino livre (freestyle) do visitante: exercícios entram na hora.
const TECNICAS_LIVRE_IDS = ["normal", "dropset", "rest_pause", "biset", "triset", "superset", "piramide", "piramide_decrescente", "myo_reps", "cluster", "tres_sete", "negativo", "super_slow", "isometria", "unilateral"] as const;
export const livreIniciarSchema = z.object({
  client_key: z.string().min(4).max(80),
  /** Treino livre como treino extra (dor forte não entra: o extra pede conversa com o Montinho). */
  extra: z.object({ corpo: z.enum(["bem", "cansado", "dor_leve", "dor_moderada", "dor"]) }).nullable().optional(),
});
export const livreExercicioSchema = z
  .object({
    client_key: z.string().min(4).max(80),
    biblioteca_id: z.string().min(1).max(80).nullable().optional(),
    nome_livre: z.string().trim().min(2, "Dê um nome ao exercício").max(60).nullable().optional(),
    tecnica: z.enum(TECNICAS_LIVRE_IDS).default("normal"),
  })
  .refine((e) => Boolean(e.biblioteca_id) !== Boolean(e.nome_livre), "Escolha um exercício da biblioteca ou escreva o nome dele");
export const livreAjusteSchema = z.object({
  tecnica: z.enum(TECNICAS_LIVRE_IDS).optional(),
  /** Sem o campo = não mexe na anotação; vazio = apaga. */
  observacao: z.string().trim().max(300).nullable().optional(),
});
/** Foto do aparelho (treino livre): JPEG reduzido pelo navegador. */
export const livreFotoAparelhoSchema = z
  .object({ base64: z.string().min(100).max(2_000_000).regex(/^[A-Za-z0-9+/=]+$/, "Imagem inválida") })
  .strict();

// Strava (0086): id do treino para buscar o batimento do relógio.
export const idSessaoStravaSchema = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);

// “Criar com IA” no montador do personal: pedido + aluno + letra do treino.
export const criarTreinoIASchema = z
  .object({
    pedido: z.string().trim().min(3, "Escreva o que você quer no treino").max(2000),
    aluno_id: z.string().trim().min(1).max(80),
    letra: z.string().trim().min(1).max(2),
    foco: z.string().trim().max(120).nullable().optional(),
  })
  .strict();

// Desafios entre alunos (0094)
const idAluno = z.string().trim().min(1).max(64);
export const novoDesafioSchema = z.object({
  nome: z.string().trim().min(3, "Dê um nome ao desafio (3 letras ou mais)").max(60),
  tipo: z.enum(["mais_treinos", "corrida", "meta_fixa", "semanas", "madrugador", "volume", "evolucao", "recordes", "musculo", "dupla", "treino_desafio"]),
  meta: z.number().int().min(1).max(200).nullable(),
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de início inválida"),
  dias: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(28), z.literal(30)]),
  foco: z.enum(["pernas", "gluteo", "bracos", "peito", "costas", "ombros", "abdomen"]).nullable().optional(),
  exercicios: z.array(z.object({ id: idAluno, nome: z.string().trim().min(1).max(80) })).max(10).nullable().optional(),
  modelo: z.string().regex(/^[a-z0-9_]{1,40}$/).nullable().optional(),
  revancheDe: idAluno.nullable().optional(),
  atividades: z.enum(["musculacao", "cardio", "ambos"]).nullable().optional(),
  convidar: z.array(idAluno).max(29).default([]),
});
export const convidarDesafioSchema = z.object({ alunos: z.array(idAluno).min(1).max(29) });
export const responderDesafioSchema = z.object({ aceitar: z.boolean() });
export const cutucarSchema = z.object({ para: idAluno, emoji: z.enum(["🔥", "💪", "😈", "⏰", "👀"]) });
export const entrarDesafioSchema = z.object({ codigo: z.string().trim().regex(/^[A-Za-z0-9]{6}$/, "Código inválido") });

// “Treinando agora”: recado do personal no meio do treino.
export const recadoAoVivoSchema = z.object({
  sessao_id: z.string().trim().min(1).max(64).regex(/^[\w-]+$/),
  texto: z.string().trim().min(1, "Escreva o recado").max(200),
});

// Montinho Pulso: respostas do cardápio (src/lib/pulso/perguntas.ts).
export const pulsoSchema = z.object({
  respostas: z.object({
    energia: z.enum(["muito_baixa", "baixa", "normal", "alta", "muito_alta"]).optional(),
    recuperacao: z.enum(["bem", "um_pouco_cansado", "muito_cansado", "desconforto"]).optional(),
    motivacao: z.enum(["nenhuma", "pouca", "normal", "muita"]).optional(),
    sono: z.enum(["muito_mal", "mal", "razoavel", "bem", "muito_bem"]).optional(),
    dificuldade: z.array(z.enum(["falta_tempo", "cansaco", "desmotivacao", "exercicios", "rotina_corrida", "nada"])).max(6).optional(),
  }).default({}),
  pulou: z.boolean().optional(),
  sessao_id: z.string().trim().min(1).max(64).regex(/^[\w-]+$/).nullable().optional(),
  /** Consentimento para dado de saúde (corpo e sono), respondido no próprio cartão. */
  consentimento: z.boolean().optional(),
});

// Montinho Pulso: o que o personal fez com o alerta.
export const alertaPulsoSchema = z.object({
  aluno_id: z.string().trim().min(1).max(64).regex(/^[\w-]+$/),
  chave: z.string().trim().regex(/^pulso:(atencao|acompanhar|reconhecer):\d{4}-\d{2}-\d{2}$/),
  acao: z.enum(["acompanhado", "dispensado", "adiado", "contato"]),
  dias: z.coerce.number().int().min(1).max(30).optional(),
});

// Modelos de mensagem do WhatsApp do personal (src/lib/acompanhamento/modelos.ts).
const textoModelo = z.string().trim().max(500).refine((t) => !/\{(?!nome\}|dias\}|semanas\})[^}]*\}/.test(t), "Use só {nome}, {dias} ou {semanas}");
export const modelosMensagemSchema = z
  .object({ ausencia: textoModelo, queda: textoModelo, retorno: textoModelo, pouco_tempo: textoModelo, progresso: textoModelo, renovacao: textoModelo, apoio: textoModelo, cuidado: textoModelo, cardio_falta: textoModelo, cardio_meta: textoModelo, cardio_retorno: textoModelo, cardio_trofeu: textoModelo, cardio_queda: textoModelo })
  .partial()
  .strict();

// Contato registrado pelo personal depois de enviar a mensagem (Central de aderência).
export const contatoAcompanhamentoSchema = z.object({
  aluno_id: z.string().trim().min(1).max(64).regex(/^[\w-]+$/),
  motivo: z.enum(["ausencia", "plano_alterado", "registro", "queda", "retomada", "sequencia", "pausa", "sem_carga", "avaliacao", "cardio"]),
});

// Montinho Cardio (0098) ---------------------------------------------------
const modalidadeCardio = z.enum(["caminhada", "corrida", "esteira", "bike_ergometrica", "bike", "eliptico", "escada", "remo", "natacao", "corda", "hiit", "outro"]);
const intensidadeCardio = z.enum(["leve", "moderada", "forte"]);
const fc = z.coerce.number().int().min(30).max(240).nullable().optional();

export const prescricaoCardioSchema = z
  .object({
    modalidade: z.union([modalidadeCardio, z.literal("livre")]),
    nome: z.string().trim().min(1).max(60).nullable().optional(),
    tipo: z.enum(["continuo", "intervalado"]).default("continuo"),
    duracao_min: z.coerce.number().int().min(5).max(240),
    intensidade: intensidadeCardio.default("moderada"),
    frequencia_semanal: z.coerce.number().int().min(1).max(7),
    minutos_semana: z.coerce.number().int().min(10).max(1680).nullable().optional(),
    dias: z.array(z.coerce.number().int().min(0).max(6)).max(7).default([]),
    vinculo: z.enum(["qualquer", "independente", "apos_treino", "antes_treino"]).default("qualquer"),
    treino_id: z.string().uuid().nullable().optional(),
    fc_alvo_min: z.coerce.number().int().min(60).max(220).nullable().optional(),
    fc_alvo_max: z.coerce.number().int().min(60).max(220).nullable().optional(),
    intervalos: z.string().trim().max(200).nullable().optional(),
    observacoes: z.string().trim().max(500).nullable().optional(),
    substitui_id: z.string().min(1).max(64).nullable().optional(),
  })
  .refine((p) => p.fc_alvo_min == null || p.fc_alvo_max == null || p.fc_alvo_min <= p.fc_alvo_max, { message: "A FC mínima precisa ser menor que a máxima." });

export const desativarPrescricaoCardioSchema = z.object({ prescricao_id: z.string().min(1).max(64) });

export const registroCardioSchema = z
  .object({
    client_key: z.string().min(8).max(80),
    prescricao_id: z.string().min(1).max(64).nullable().optional(),
    modalidade: modalidadeCardio,
    status: z.enum(["concluido", "parcial", "nao_realizado"]),
    duracao_min: z.coerce.number().int().min(0).max(600).default(0),
    intensidade: intensidadeCardio.nullable().optional(),
    esforco: z.coerce.number().int().min(0).max(10).nullable().optional(),
    distancia_km: z.coerce.number().min(0).max(500).nullable().optional(),
    velocidade_kmh: z.coerce.number().min(0).max(80).nullable().optional(),
    inclinacao_pct: z.coerce.number().min(-10).max(40).nullable().optional(),
    fc_media: fc,
    fc_max: fc,
    observacoes: z.string().trim().max(300).nullable().optional(),
    session_id: z.string().min(1).max(64).nullable().optional(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .refine((r) => r.status === "nao_realizado" || r.duracao_min >= 1, { message: "Informe quantos minutos você fez." });

export const correcaoCardioSchema = z.object({
  status: z.enum(["concluido", "parcial", "nao_realizado"]).optional(),
  modalidade: modalidadeCardio.optional(),
  duracao_min: z.coerce.number().int().min(0).max(600).optional(),
  intensidade: intensidadeCardio.nullable().optional(),
  esforco: z.coerce.number().int().min(0).max(10).nullable().optional(),
  distancia_km: z.coerce.number().min(0).max(500).nullable().optional(),
  velocidade_kmh: z.coerce.number().min(0).max(80).nullable().optional(),
  inclinacao_pct: z.coerce.number().min(-10).max(40).nullable().optional(),
  fc_media: fc,
  fc_max: fc,
  observacoes: z.string().trim().max(300).nullable().optional(),
  remover: z.boolean().optional(),
});
