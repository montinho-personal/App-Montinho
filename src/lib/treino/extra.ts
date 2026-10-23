// ============================================================================
// “Quero fazer um treino extra” — classificação PURA, explícita e testada.
//
// Três respostas possíveis, sempre com os motivos:
//   • liberado          — dentro das regras que o personal configurou;
//   • aprovacao         — só com OK manual do personal;
//   • nao_recomendado   — não fazer agora (e por quê).
// Falta de informação nunca vira “seguro”: sem configuração do personal não
// há extra; sem resposta de recuperação, treino resistido pede aprovação.
// Motivação sozinha nunca libera nada.
// ============================================================================

import { dataLocal, diaDaSemana, inicioDaSemana } from "@/lib/aderencia/calcular";

export const MODALIDADES = {
  cardio_leve: { rotulo: "Cardio leve", intenso: false },
  cardio_moderado: { rotulo: "Cardio moderado", intenso: false },
  tecnica: { rotulo: "Sessão técnica", intenso: false },
  mobilidade: { rotulo: "Mobilidade", intenso: false },
  atividade_geral: { rotulo: "Atividade física geral (curta)", intenso: false },
  complementar: { rotulo: "Treino complementar específico", intenso: true },
  resistido: { rotulo: "Treino resistido adicional", intenso: true },
} as const;
export type Modalidade = keyof typeof MODALIDADES;

export const RECUPERACAO = {
  bem: "Bem recuperado",
  cansado: "Um pouco cansado",
  dor: "Com dor ou desconforto",
  prefiro_nao: "Prefiro não responder",
} as const;
export type Recuperacao = keyof typeof RECUPERACAO;

export type ConfigExtra = {
  habilitado: boolean;
  requer_aprovacao: boolean;
  /** Com requer_aprovacao: só extras intensos (musculação, complementar) viram pedido; os leves seguem as regras. */
  aprovacao_so_intensos: boolean;
  max_por_semana: number;
  /** 0 = domingo … 6 = sábado */
  dias_permitidos: number[];
  /** Limite de séries extras de treino resistido/complementar por semana. */
  limite_series_semana: number;
  /** Intervalo mínimo desde o último treino (horas) para extra intenso sem aprovação. */
  intervalo_min_horas: number;
};

export const CONFIG_EXTRA_PADRAO: ConfigExtra = { habilitado: false, requer_aprovacao: true, aprovacao_so_intensos: true, max_por_semana: 1, dias_permitidos: [0, 1, 2, 3, 4, 5, 6], limite_series_semana: 12, intervalo_min_horas: 12 };

export type ExtraLiberado = {
  id: string;
  modalidade: Modalidade;
  titulo: string;
  duracao_min: number;
  /** Grupos musculares envolvidos (extras intensos). */
  grupos: string[];
  series_estimadas: number;
  ativo: boolean;
  /** 0073: exercícios do extra aprovado pelo personal (o aluno registra série por série). */
  exercicios?: ItemExtraAprovado[] | null;
};

/** Um exercício do treino extra pronto (biblioteca, séries, repetições). */
export type ItemExtraAprovado = { biblioteca_id: string | null; nome: string; series: number; reps: string };

export type SessaoRecente = {
  iniciado_em: string;
  finalizado_em?: string | null;
  status: "em_andamento" | "concluida" | "abandonada";
  modo?: "normal" | "reduzido" | "extra" | null;
  series_concluidas: number;
  checkin_pre?: string | null;
  feedback_percepcao?: string | null;
  grupos: string[];
  /** Séries válidas feitas (para o limite semanal de extras). */
  series_extra?: number;
};

export type Classe = "liberado" | "aprovacao" | "nao_recomendado";
export type Classificacao = { classe: Classe; motivos: string[] };

export const REGRAS_EXTRA = { horasGrupoRecente: 48, horasDesconforto: 72 };

const ROT_GRUPO = (g: string) => g.replace(/_/g, " ");

export function classificarExtra(e: {
  config: ConfigExtra | null;
  extra: ExtraLiberado;
  agora: Date;
  sessoes: SessaoRecente[];
  recuperacao: Recuperacao | null;
  tempoDisponivelMin: number | null;
  /** Já existe pedido aprovado para este extra hoje? */
  aprovadoHoje?: boolean;
}): Classificacao {
  const { config: c, extra: x } = e;
  // Bloqueios absolutos: nem a aprovação do dia passa por cima.
  const absoluto = (m: string): Classificacao => ({ classe: "nao_recomendado", motivos: [m] });
  // Demais bloqueios: o personal pode aprovar conscientemente (a decisão final é dele).
  const nao = (m: string): Classificacao => (e.aprovadoHoje ? { classe: "liberado", motivos: [`Aprovado pelo personal para hoje, ciente de que: ${m.charAt(0).toLowerCase()}${m.slice(1)}`, "Treino extra não conta na meta semanal; ele aparece separado no seu histórico."] } : { classe: "nao_recomendado", motivos: [m] });
  if (!c || !c.habilitado) return absoluto("O personal ainda não liberou treinos extras para você.");
  if (!x.ativo) return absoluto("Esta opção de treino extra não está mais disponível.");

  const hoje = dataLocal(e.agora);
  const agoraMs = e.agora.getTime();
  const horas = (iso: string) => (agoraMs - new Date(iso).getTime()) / 3_600_000;
  const validas = e.sessoes.filter((s) => s.status !== "em_andamento" && s.series_concluidas > 0);
  const intenso = MODALIDADES[x.modalidade].intenso;

  if (e.recuperacao === "dor") return absoluto("Você relatou dor ou desconforto. Fale com o personal antes de treinar mais.");
  const desconfortoRecente = validas.some((s) => (s.checkin_pre === "desconforto" || s.feedback_percepcao === "dor") && horas(s.finalizado_em ?? s.iniciado_em) < REGRAS_EXTRA.horasDesconforto);
  if (desconfortoRecente && x.modalidade !== "mobilidade") return nao("Você relatou desconforto ou dor num treino recente. O personal precisa avaliar antes de um extra.");

  if (!c.dias_permitidos.includes(diaDaSemana(hoje))) return nao("Hoje não é um dos dias liberados para treino extra.");
  const semana = inicioDaSemana(hoje);
  const extrasSemana = validas.filter((s) => s.modo === "extra" && dataLocal(s.iniciado_em) >= semana);
  if (extrasSemana.length >= c.max_por_semana) return nao(`Você já fez ${extrasSemana.length} treino(s) extra(s) nesta semana — o limite combinado é ${c.max_por_semana}.`);
  if (e.tempoDisponivelMin != null && e.tempoDisponivelMin < x.duracao_min) return nao(`Esta sessão leva cerca de ${x.duracao_min} min e você tem ${e.tempoDisponivelMin} min.`);

  const pedeAprovacao: string[] = [];
  if (intenso) {
    const recentes = validas.filter((s) => horas(s.finalizado_em ?? s.iniciado_em) < REGRAS_EXTRA.horasGrupoRecente);
    const repetidos = [...new Set(x.grupos.filter((g) => recentes.some((s) => s.grupos.includes(g))))];
    if (repetidos.length) return nao(`${repetidos.map(ROT_GRUPO).join(", ")} ${repetidos.length > 1 ? "foram treinados" : "foi treinado"} há menos de ${REGRAS_EXTRA.horasGrupoRecente} h. Recuperação também faz parte do treino.`);
    const seriesSemana = extrasSemana.reduce((n, s) => n + (s.series_extra ?? 0), 0);
    if (seriesSemana + x.series_estimadas > c.limite_series_semana) return nao(`Somaria ${seriesSemana + x.series_estimadas} séries extras na semana — acima do limite combinado (${c.limite_series_semana}).`);
    if (e.recuperacao === "cansado") return nao("Você está um pouco cansado: hoje o descanso tende a render mais que um treino intenso extra.");
    if (!e.recuperacao || e.recuperacao === "prefiro_nao") pedeAprovacao.push("Sem a resposta sobre recuperação, um extra intenso precisa do OK do personal.");
    const ultima = validas.map((s) => s.finalizado_em ?? s.iniciado_em).sort().at(-1);
    if (ultima && horas(ultima) < c.intervalo_min_horas) pedeAprovacao.push(`Seu último treino foi há menos de ${c.intervalo_min_horas} h.`);
  } else if (x.modalidade === "cardio_moderado" && e.recuperacao === "cansado") {
    pedeAprovacao.push("Você está um pouco cansado: o personal decide se vale um cardio moderado hoje.");
  }
  if (c.requer_aprovacao && !(c.aprovacao_so_intensos && !intenso)) pedeAprovacao.push(c.aprovacao_so_intensos ? "O personal pediu para aprovar cada treino extra de musculação." : "O personal pediu para aprovar cada treino extra.");

  if (pedeAprovacao.length && !e.aprovadoHoje) return { classe: "aprovacao", motivos: pedeAprovacao };
  return { classe: "liberado", motivos: [e.aprovadoHoje ? "Aprovado pelo personal para hoje." : "Dentro das regras que o personal configurou para você.", "Treino extra não conta na meta semanal; ele aparece separado no seu histórico."] };
}
