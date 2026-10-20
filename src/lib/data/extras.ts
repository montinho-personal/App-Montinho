// ============================================================================
// Treino extra — persistência e avaliação no SERVIDOR (o navegador nunca
// decide se um extra está liberado). Regras puras em src/lib/treino/extra.ts.
// Sempre pelo cliente com RLS: aluno lê os próprios e só cria pedido pendente;
// o personal configura, libera e decide.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { listSessoes, type SessaoCompleta } from "@/lib/data/sessoes";
import { dataLocal, inicioDaSemana } from "@/lib/aderencia/calcular";
import { classificarExtra, CONFIG_EXTRA_PADRAO, type Classificacao, type ConfigExtra, type ExtraLiberado, type Modalidade, type Recuperacao, type SessaoRecente } from "@/lib/treino/extra";
import type { TrainingSession } from "@/lib/supabase/types-sessoes";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { periodoDias, seriesRealizadasPorGrupo } from "@/lib/relatorios/calcular";
import { volumeRealizadoPorGrupo, type MetaVolume } from "@/lib/volume/calcular";
import { REGRAS_SUGESTAO, sugerirExtraPorVolume, type CandidatoExercicio, type ResultadoSugestao } from "@/lib/treino/sugestao-extra";

export type ConfigExtraRow = ConfigExtra & { aluno_id: string; observacao: string | null; updated_at: string };
export type ExtraRow = ExtraLiberado & { aluno_id: string; descricao: string | null; treino_id: string | null; created_at: string };
export type SolicitacaoExtra = {
  id: string;
  aluno_id: string;
  extra_id: string;
  client_key: string;
  data: string;
  status: "pendente" | "aprovada" | "recusada";
  classificacao: Classificacao["classe"];
  motivos: string[];
  recuperacao: Recuperacao | null;
  tempo_disponivel_min: number | null;
  mensagem_aluno: string | null;
  resposta: string | null;
  decidido_em: string | null;
  created_at: string;
};

type DemoExtras = { configs: ConfigExtraRow[]; extras: ExtraRow[]; solicitacoes: SolicitacaoExtra[] };
function demo(): DemoExtras {
  const g = globalThis as unknown as { __montinhoExtras?: DemoExtras };
  if (!g.__montinhoExtras) {
    // Dados fictícios do modo demonstração: a Aline tem extras liberados.
    const agora = new Date().toISOString();
    g.__montinhoExtras = {
      configs: [{ aluno_id: "aline", ...CONFIG_EXTRA_PADRAO, habilitado: true, requer_aprovacao: false, max_por_semana: 2, observacao: null, updated_at: agora }],
      extras: [
        { id: "extra-caminhada", aluno_id: "aline", modalidade: "cardio_leve", titulo: "Caminhada leve", descricao: "Ritmo em que dá para conversar. Sem subir ladeira forte.", duracao_min: 30, treino_id: null, grupos: [], series_estimadas: 0, ativo: true, created_at: agora },
        { id: "extra-mobilidade", aluno_id: "aline", modalidade: "mobilidade", titulo: "Mobilidade de quadril e ombros", descricao: "Sequência leve, sem dor.", duracao_min: 20, treino_id: null, grupos: [], series_estimadas: 0, ativo: true, created_at: agora },
        { id: "extra-bracos", aluno_id: "aline", modalidade: "resistido", titulo: "Braços complementar", descricao: "Rosca e tríceps, 2 exercícios × 4 séries, RIR 2.", duracao_min: 25, treino_id: null, grupos: ["biceps", "triceps"], series_estimadas: 8, ativo: true, created_at: agora },
      ],
      solicitacoes: [],
    };
  }
  return g.__montinhoExtras;
}

// ---------------------------------------------------------------------------
// Configuração e extras liberados (personal)
// ---------------------------------------------------------------------------
export async function getConfigExtra(alunoId: string): Promise<ConfigExtraRow | null> {
  if (isDemoMode()) return demo().configs.find((c) => c.aluno_id === alunoId) ?? null;
  const db = await getDb();
  const { data } = await db.from("config_extra").select("*").eq("aluno_id", alunoId).maybeSingle();
  return (data as ConfigExtraRow | null) ?? null;
}

export async function salvarConfigExtra(alunoId: string, c: ConfigExtra & { observacao: string | null }): Promise<void> {
  const linha = { aluno_id: alunoId, ...c, dias_permitidos: [...new Set(c.dias_permitidos)].sort(), updated_at: new Date().toISOString() };
  if (isDemoMode()) {
    const st = demo();
    st.configs = [...st.configs.filter((x) => x.aluno_id !== alunoId), linha];
    return;
  }
  const db = await getDb();
  const { error } = await db.from("config_extra").upsert(linha, { onConflict: "aluno_id" });
  if (error) throw new Error(error.message);
}

export async function listarExtras(alunoId: string | null, apenasAtivos = false): Promise<ExtraRow[]> {
  if (isDemoMode()) return demo().extras.filter((x) => (!alunoId || x.aluno_id === alunoId) && (!apenasAtivos || x.ativo));
  const db = await getDb();
  let q = db.from("extras_liberados").select("*").order("created_at");
  if (alunoId) q = q.eq("aluno_id", alunoId);
  if (apenasAtivos) q = q.eq("ativo", true);
  const { data } = await q;
  return (data ?? []) as ExtraRow[];
}

export type ExtraInput = { modalidade: Modalidade; titulo: string; descricao: string | null; duracao_min: number; treino_id: string | null; grupos: string[]; series_estimadas: number };

export async function salvarExtra(alunoId: string, input: ExtraInput, id?: string | null): Promise<ExtraRow> {
  if (isDemoMode()) {
    const st = demo();
    const existente = id ? st.extras.find((x) => x.id === id && x.aluno_id === alunoId) : null;
    if (existente) {
      Object.assign(existente, input);
      return existente;
    }
    const novo: ExtraRow = { id: uid(), aluno_id: alunoId, ativo: true, created_at: new Date().toISOString(), ...input };
    st.extras.push(novo);
    return novo;
  }
  const db = await getDb();
  const q = id ? db.from("extras_liberados").update(input).eq("id", id).eq("aluno_id", alunoId) : db.from("extras_liberados").insert({ aluno_id: alunoId, ...input });
  const { data, error } = await q.select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao salvar");
  return data as ExtraRow;
}

/** Nunca apaga (pode haver histórico): só desativa ou reativa. */
export async function definirExtraAtivo(alunoId: string, id: string, ativo: boolean): Promise<void> {
  if (isDemoMode()) {
    const x = demo().extras.find((e) => e.id === id && e.aluno_id === alunoId);
    if (x) x.ativo = ativo;
    return;
  }
  const db = await getDb();
  const { error } = await db.from("extras_liberados").update({ ativo }).eq("id", id).eq("aluno_id", alunoId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
export async function listarSolicitacoes(f: { alunoId?: string | null; status?: SolicitacaoExtra["status"]; desde?: string } = {}): Promise<SolicitacaoExtra[]> {
  if (isDemoMode()) {
    return demo()
      .solicitacoes.filter((s) => (!f.alunoId || s.aluno_id === f.alunoId) && (!f.status || s.status === f.status) && (!f.desde || s.created_at >= f.desde))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const db = await getDb();
  let q = db.from("solicitacoes_extra").select("*").order("created_at", { ascending: false }).limit(200);
  if (f.alunoId) q = q.eq("aluno_id", f.alunoId);
  if (f.status) q = q.eq("status", f.status);
  if (f.desde) q = q.gte("created_at", f.desde);
  const { data } = await q;
  return (data ?? []) as SolicitacaoExtra[];
}

export async function decidirSolicitacao(id: string, status: "aprovada" | "recusada", resposta: string | null): Promise<void> {
  const patch = { status, resposta, decidido_em: new Date().toISOString() };
  if (isDemoMode()) {
    const s = demo().solicitacoes.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
    return;
  }
  const db = await getDb();
  const { error } = await db.from("solicitacoes_extra").update(patch).eq("id", id).eq("status", "pendente");
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Avaliação (servidor)
// ---------------------------------------------------------------------------
export function sessaoRecente(s: SessaoCompleta): SessaoRecente {
  const comSerie = s.exercicios.filter((e) => e.series.some((x) => x.tipo !== "aquecimento"));
  return {
    iniciado_em: s.iniciado_em,
    finalizado_em: s.finalizado_em,
    status: s.status,
    modo: s.modo ?? "normal",
    series_concluidas: s.modo === "extra" && !s.series_concluidas && (s.duracao_seg ?? 0) > 0 ? 1 : s.series_concluidas,
    checkin_pre: s.checkin_pre ?? null,
    feedback_percepcao: s.feedback_percepcao,
    grupos: [...new Set(comSerie.map((e) => e.grupo_muscular).filter((g): g is NonNullable<typeof g> => !!g))],
    series_extra: s.modo === "extra" ? (s.series_concluidas || ((s.snapshot as { extra?: { series_estimadas?: number } } | null)?.extra?.series_estimadas ?? 0)) : 0,
  };
}

export type ExtraAvaliado = { extra: ExtraRow; classificacao: Classificacao; pedidoHoje: SolicitacaoExtra | null };

export async function avaliarExtras(alunoId: string, opts: { recuperacao: Recuperacao | null; tempoDisponivelMin: number | null; agora?: Date }): Promise<{ config: ConfigExtraRow | null; itens: ExtraAvaliado[] }> {
  const agora = opts.agora ?? new Date();
  const hoje = dataLocal(agora);
  const [config, extras, sessoes, pedidos] = await Promise.all([getConfigExtra(alunoId), listarExtras(alunoId, true), listSessoes(alunoId, { limite: 40, status: "todas" }), listarSolicitacoes({ alunoId, desde: new Date(agora.getTime() - 3 * 86_400_000).toISOString() })]);
  const recentes = sessoes.map(sessaoRecente);
  const itens = extras.map((extra) => {
    const doDia = pedidos.filter((p) => p.extra_id === extra.id && p.data === hoje);
    const aprovado = doDia.find((p) => p.status === "aprovada") ?? null;
    const classificacao = classificarExtra({ config, extra, agora, sessoes: recentes, recuperacao: opts.recuperacao, tempoDisponivelMin: opts.tempoDisponivelMin, aprovadoHoje: !!aprovado });
    return { extra, classificacao, pedidoHoje: aprovado ?? doDia[0] ?? null };
  });
  return { config, itens };
}

export async function criarSolicitacao(alunoId: string, input: { extraId: string; clientKey: string; recuperacao: Recuperacao | null; tempoDisponivelMin: number | null; mensagem: string | null }): Promise<SolicitacaoExtra> {
  const { itens } = await avaliarExtras(alunoId, { recuperacao: input.recuperacao, tempoDisponivelMin: input.tempoDisponivelMin });
  const item = itens.find((i) => i.extra.id === input.extraId);
  if (!item) throw new Error("Treino extra não encontrado");
  const linha = {
    aluno_id: alunoId,
    extra_id: input.extraId,
    client_key: input.clientKey,
    data: dataLocal(new Date()),
    status: "pendente" as const,
    classificacao: item.classificacao.classe,
    motivos: item.classificacao.motivos,
    recuperacao: input.recuperacao,
    tempo_disponivel_min: input.tempoDisponivelMin,
    mensagem_aluno: input.mensagem,
  };
  if (isDemoMode()) {
    const st = demo();
    const ja = st.solicitacoes.find((s) => s.aluno_id === alunoId && s.client_key === input.clientKey);
    if (ja) return ja;
    const nova: SolicitacaoExtra = { id: uid(), resposta: null, decidido_em: null, created_at: new Date().toISOString(), ...linha };
    st.solicitacoes.push(nova);
    return nova;
  }
  const db = await getDb();
  const { data, error } = await db.from("solicitacoes_extra").insert(linha).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const { data: ja } = await db.from("solicitacoes_extra").select("*").eq("aluno_id", alunoId).eq("client_key", input.clientKey).single();
      return ja as SolicitacaoExtra;
    }
    throw new Error(error.message);
  }
  return data as SolicitacaoExtra;
}

/** Garante, no servidor, que o extra está liberado para o aluno agora. */
export async function exigirExtraLiberado(alunoId: string, extraId: string, opts: { recuperacao: Recuperacao | null; tempoDisponivelMin: number | null }): Promise<ExtraRow> {
  const { itens } = await avaliarExtras(alunoId, opts);
  const item = itens.find((i) => i.extra.id === extraId);
  if (!item) throw new Error("Treino extra não encontrado");
  if (item.classificacao.classe !== "liberado") throw new Error(`Treino extra não liberado agora: ${item.classificacao.motivos[0]}`);
  return item.extra;
}

/**
 * Registra um extra de atividade (cardio, mobilidade…) já feito, com a duração
 * informada pelo aluno. Idempotente por client_key. Não conta na meta semanal.
 */
export async function registrarAtividadeExtra(alunoId: string, input: { extraId: string; clientKey: string; duracaoMin: number; recuperacao: Recuperacao | null }): Promise<TrainingSession> {
  const agora = new Date();
  if (isDemoMode()) {
    const ja = demoStore().sessions.find((s) => s.aluno_id === alunoId && s.client_key === input.clientKey);
    if (ja) return ja;
  } else {
    const db = await getDb();
    const { data } = await db.from("training_sessions").select("*").eq("aluno_id", alunoId).eq("client_key", input.clientKey).maybeSingle();
    if (data) return data as TrainingSession;
  }
  const extra = await exigirExtraLiberado(alunoId, input.extraId, { recuperacao: input.recuperacao, tempoDisponivelMin: null });
  if (extra.treino_id) throw new Error("Este extra é um treino com séries: inicie pelo treino.");
  const duracaoSeg = Math.round(input.duracaoMin * 60);
  const inicio = new Date(agora.getTime() - duracaoSeg * 1000).toISOString();
  const sessao: TrainingSession = {
    id: uid(),
    aluno_id: alunoId,
    treino_id: null,
    programa_versao_id: null,
    letra: null,
    nome_treino: extra.titulo,
    client_key: input.clientKey,
    status: "concluida",
    iniciado_em: inicio,
    finalizado_em: agora.toISOString(),
    duracao_seg: duracaoSeg,
    snapshot: { extra: { id: extra.id, modalidade: extra.modalidade, titulo: extra.titulo, duracao_min: extra.duracao_min, grupos: extra.grupos, series_estimadas: extra.series_estimadas }, recuperacao: input.recuperacao },
    series_planejadas: 0,
    series_concluidas: 0,
    tempo_estimado_seg: extra.duracao_min * 60,
    pausado_seg: 0,
    checkin_pre: null,
    checkin_pre_nota: null,
    modo: "extra",
    extra_id: extra.id,
    feedback_percepcao: null,
    feedback_comentario: null,
    origem: "app",
    created_at: agora.toISOString(),
    updated_at: agora.toISOString(),
  };
  if (isDemoMode()) {
    demoStore().sessions.push(sessao);
    return sessao;
  }
  const db = await getDb();
  const { id: _i, created_at: _c, updated_at: _u, ...payload } = sessao;
  void _i; void _c; void _u;
  const { data, error } = await db.from("training_sessions").insert(payload).select("*").single();
  if (error) throw new Error(`Não foi possível registrar: ${error.message}`);
  return data as TrainingSession;
}

// ---------------------------------------------------------------------------
// Sugestão automática (grupos abaixo da meta semanal) — sempre para aprovação
// ---------------------------------------------------------------------------
export async function sugestaoExtraDoAluno(alunoId: string, agora = new Date()): Promise<ResultadoSugestao & { habilitado: boolean }> {
  const [config, plano, sessoes, biblioteca] = await Promise.all([getConfigExtra(alunoId), getPlanoAtivo(alunoId), listSessoes(alunoId, { limite: 60, status: "todas" }), listarBiblioteca()]);
  const habilitado = !!config?.habilitado;
  const feito7d = volumeRealizadoPorGrupo(seriesRealizadasPorGrupo(sessoes, periodoDias(7, agora)), false);
  const recentes = sessoes.map(sessaoRecente).filter((s) => s.status !== "em_andamento" && s.series_concluidas > 0 && agora.getTime() - new Date(s.finalizado_em ?? s.iniciado_em).getTime() < REGRAS_SUGESTAO.horasRecuperacao * 3_600_000);
  const semana = inicioDaSemana(dataLocal(agora));
  const extrasSemana = sessoes.filter((s) => s.modo === "extra" && dataLocal(s.iniciado_em) >= semana).reduce((n, s) => n + (sessaoRecente(s).series_extra ?? 0), 0);
  const limite = config?.limite_series_semana ?? CONFIG_EXTRA_PADRAO.limite_series_semana;
  const comVideo = new Set(biblioteca.filter((b) => b.midia?.verificada).map((b) => b.id));
  const candidatos: CandidatoExercicio[] = [
    ...plano.treinos.filter((t) => t.ativo).flatMap((t) => t.exercicios).filter((x) => x.grupo_muscular && x.conta_volume !== false).map((x) => ({ nome: x.nome, grupo: x.grupo_muscular as GrupoMuscular, doPlano: true, temVideo: !!x.biblioteca_id && comVideo.has(x.biblioteca_id) })),
    ...biblioteca.filter((b) => b.contaVolume !== false).map((b) => ({ nome: b.nome, grupo: b.grupo, doPlano: false, temVideo: !!b.midia?.verificada })),
  ];
  const r = sugerirExtraPorVolume({
    metas: (plano.programa?.metas_volume ?? {}) as Partial<Record<GrupoMuscular, MetaVolume>>,
    feito7d,
    recentes48h: [...new Set(recentes.flatMap((s) => s.grupos))] as GrupoMuscular[],
    seriesExtrasDisponiveis: limite - extrasSemana,
    candidatos,
    prioridades: plano.programa?.prioridades ?? [],
  });
  return { ...r, habilitado };
}
