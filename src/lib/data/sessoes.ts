// ============================================================================
// Sessões realizadas: iniciar, registrar séries (idempotente), finalizar,
// consultar histórico e últimas cargas. Toda escrita é do PRÓPRIO aluno
// (RLS no live; checagem explícita de aluno_id no demo).
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { normalizarNome } from "@/lib/grupos";
import type { SerieTipo, SessionExercise, SessionExerciseStatus, SessionSet, TrainingSession, TreinoLetra } from "@/lib/supabase/types-sessoes";
import { getPlanoAtivo, getTreinoComExercicios } from "./programas";
// Ciclo intencional (só chamadas em tempo de execução): extras usa listSessoes.
import { exigirExtraLiberado } from "./extras";
import { treinoPossivel, type ResultadoPossivel } from "@/lib/treino/possivel";
import type { Recuperacao } from "@/lib/treino/extra";
import { estimarPrescricao } from "@/lib/tempo/prescricao";
import type { ParametrosTempo } from "@/lib/tempo/estimar";

export type SessaoCompleta = TrainingSession & {
  exercicios: Array<SessionExercise & { series: SessionSet[] }>;
};

export type SerieInput = {
  session_exercise_id: string;
  client_key: string;
  serie: number;
  tipo?: SerieTipo;
  carga_kg?: number | null;
  reps?: number | null;
  rir?: number | null;
  rpe?: number | null;
  tempo_seg?: number | null;
  lado?: "direito" | "esquerdo" | "ambos" | null;
  desconforto?: number | null;
  observacoes?: string | null;
  concluida_em?: string | null;
};

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------
function montarCompleta(s: TrainingSession, exs: SessionExercise[], sets: SessionSet[]): SessaoCompleta {
  return {
    ...s,
    exercicios: exs
      .filter((e) => e.session_id === s.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((e) => ({ ...e, series: sets.filter((x) => x.session_exercise_id === e.id).sort((a, b) => a.serie - b.serie) })),
  };
}

export async function getSessao(alunoId: string, sessionId: string): Promise<SessaoCompleta | null> {
  if (isDemoMode()) {
    const st = demoStore();
    const s = st.sessions.find((x) => x.id === sessionId && x.aluno_id === alunoId);
    if (!s) return null;
    return montarCompleta(s, st.sessionExercises, st.sessionSets);
  }
  const db = await getDb();
  const { data: s } = await db.from("training_sessions").select("*").eq("id", sessionId).eq("aluno_id", alunoId).maybeSingle();
  if (!s) return null;
  const [{ data: exs }, { data: sets }] = await Promise.all([
    db.from("session_exercises").select("*").eq("session_id", sessionId).order("ordem"),
    db.from("session_sets").select("*").eq("session_id", sessionId).order("serie"),
  ]);
  return montarCompleta(s as TrainingSession, (exs ?? []) as SessionExercise[], (sets ?? []) as SessionSet[]);
}

export async function getSessaoEmAndamento(alunoId: string): Promise<SessaoCompleta | null> {
  if (isDemoMode()) {
    const st = demoStore();
    const s = st.sessions.filter((x) => x.aluno_id === alunoId && x.status === "em_andamento").sort((a, b) => (a.iniciado_em < b.iniciado_em ? 1 : -1))[0];
    return s ? montarCompleta(s, st.sessionExercises, st.sessionSets) : null;
  }
  const db = await getDb();
  const { data: s } = await db.from("training_sessions").select("id").eq("aluno_id", alunoId).eq("status", "em_andamento").order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
  return s ? getSessao(alunoId, s.id) : null;
}

export async function listSessoes(alunoId: string, opts: { desde?: string; ate?: string; limite?: number; status?: TrainingSession["status"] | "todas" } = {}): Promise<SessaoCompleta[]> {
  const status = opts.status ?? "concluida";
  if (isDemoMode()) {
    const st = demoStore();
    return st.sessions
      .filter((s) => s.aluno_id === alunoId && (status === "todas" || s.status === status))
      .filter((s) => (!opts.desde || s.iniciado_em >= opts.desde) && (!opts.ate || s.iniciado_em <= opts.ate))
      .sort((a, b) => (a.iniciado_em < b.iniciado_em ? 1 : -1))
      .slice(0, opts.limite ?? 200)
      .map((s) => montarCompleta(s, st.sessionExercises, st.sessionSets));
  }
  const db = await getDb();
  let q = db.from("training_sessions").select("*").eq("aluno_id", alunoId).order("iniciado_em", { ascending: false }).limit(opts.limite ?? 200);
  if (status !== "todas") q = q.eq("status", status);
  if (opts.desde) q = q.gte("iniciado_em", opts.desde);
  if (opts.ate) q = q.lte("iniciado_em", opts.ate);
  const { data: sessions } = await q;
  const ids = (sessions ?? []).map((s) => s.id);
  if (!ids.length) return [];
  const [{ data: exs }, { data: sets }] = await Promise.all([
    db.from("session_exercises").select("*").in("session_id", ids),
    db.from("session_sets").select("*").in("session_id", ids),
  ]);
  return (sessions as TrainingSession[]).map((s) => montarCompleta(s, (exs ?? []) as SessionExercise[], (sets ?? []) as SessionSet[]));
}

export type UltimaExecucao = {
  data: string;
  nomeTreino: string | null;
  series: Array<{ serie: number; carga_kg: number | null; reps: number | null; rir: number | null; tipo: SerieTipo }>;
};

/**
 * Última execução de cada exercício (por id OU por nome normalizado, para
 * sobreviver a troca/substituição de exercício no plano). Só sessões concluídas.
 */
export async function ultimasExecucoes(alunoId: string, exercicios: Array<{ id: string; nome: string }>): Promise<Record<string, UltimaExecucao | null>> {
  const sessoes = await listSessoes(alunoId, { limite: 60, status: "concluida" });
  const out: Record<string, UltimaExecucao | null> = {};
  for (const ex of exercicios) {
    const alvo = normalizarNome(ex.nome);
    let achado: UltimaExecucao | null = null;
    for (const s of sessoes) {
      const se = s.exercicios.find((e) => (e.exercicio_id === ex.id || normalizarNome(e.nome) === alvo) && e.series.some((x) => (x.tipo === "valida" || x.tipo === "dropset" || x.tipo === "rest_pause") && (x.carga_kg != null || x.reps != null)));
      if (se) {
        achado = {
          data: s.finalizado_em ?? s.iniciado_em,
          nomeTreino: s.nome_treino,
          series: se.series.filter((x) => x.tipo !== "aquecimento").map((x) => ({ serie: x.serie, carga_kg: x.carga_kg, reps: x.reps, rir: x.rir, tipo: x.tipo })),
        };
        break;
      }
    }
    out[ex.id] = achado;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Escrita (aluno)
// ---------------------------------------------------------------------------
export type IniciarSessaoInput = {
  treinoId: string;
  clientKey: string;
  checkinPre?: TrainingSession["checkin_pre"];
  checkinPreNota?: string | null;
  /** “Meu treino possível hoje”: o servidor recalcula a versão (não confia no navegador). */
  tempoDisponivelMin?: number | null;
  /** Treino extra liberado que usa este treino (o servidor confere a liberação). */
  extraId?: string | null;
  recuperacao?: Recuperacao | null;
};

export async function iniciarSessao(alunoId: string, input: IniciarSessaoInput): Promise<SessaoCompleta> {
  const agora = new Date().toISOString();
  // idempotência: mesma client_key → mesma sessão
  if (isDemoMode()) {
    const st = demoStore();
    const existente = st.sessions.find((s) => s.aluno_id === alunoId && s.client_key === input.clientKey);
    if (existente) return montarCompleta(existente, st.sessionExercises, st.sessionSets);
  } else {
    const db = await getDb();
    const { data } = await db.from("training_sessions").select("id").eq("aluno_id", alunoId).eq("client_key", input.clientKey).maybeSingle();
    if (data) return (await getSessao(alunoId, data.id))!;
  }

  const treino = await getTreinoComExercicios(input.treinoId);
  if (!treino || treino.aluno_id !== alunoId) throw new Error("Treino não encontrado para este aluno");
  if (!treino.ativo) throw new Error("Este treino não está mais liberado");

  // Versão do dia: completa, reduzida (regras do personal) ou extra liberado.
  let modo: "normal" | "reduzido" | "extra" = "normal";
  let doDia = treino.exercicios;
  let reducao: ResultadoPossivel | null = null;
  let extra: Awaited<ReturnType<typeof exigirExtraLiberado>> | null = null;
  if (input.extraId) {
    extra = await exigirExtraLiberado(alunoId, input.extraId, { recuperacao: input.recuperacao ?? null, tempoDisponivelMin: input.tempoDisponivelMin ?? null });
    if (extra.treino_id !== treino.id) throw new Error("Este treino extra não usa este treino");
    modo = "extra";
  } else if (input.tempoDisponivelMin) {
    const { programa } = await getPlanoAtivo(alunoId);
    reducao = treinoPossivel({ exercicios: treino.exercicios, tempos: temposDoTreino(treino), tempoDisponivelMin: input.tempoDisponivelMin, permiteReduzida: !!programa?.permite_versao_reduzida, prioridadesMusculares: programa?.prioridades ?? [] });
    if (reducao.status === "inviavel" || reducao.status === "nao_autorizado") throw new Error(`Sem versão possível para ${input.tempoDisponivelMin} min: ${reducao.explicacao[1] ?? reducao.explicacao[0]}`);
    if (reducao.status === "reduzido") {
      modo = "reduzido";
      const ok = new Set(reducao.incluidos);
      doDia = treino.exercicios.filter((e) => ok.has(e.id));
    }
  }

  const planejadas = doDia.reduce((n, e) => n + Math.max(0, e.series - (e.series_aquecimento ?? 0)), 0);
  const sessao: TrainingSession = {
    id: uid(),
    aluno_id: alunoId,
    treino_id: treino.id,
    programa_versao_id: null,
    letra: treino.letra as TreinoLetra,
    nome_treino: treino.nome,
    client_key: input.clientKey,
    status: "em_andamento",
    iniciado_em: agora,
    finalizado_em: null,
    duracao_seg: null,
    snapshot: {
      treino: { id: treino.id, letra: treino.letra, nome: treino.nome, observacoes: treino.observacoes, tempos: temposDoTreino(treino) },
      exercicios: doDia,
      // Versão realizada ≠ treino original: guarda o que ficou para outro dia.
      ...(reducao ? { reducao: { tempo_disponivel_min: reducao.tempoDisponivelMin, status: reducao.status, adiados: reducao.adiados, series_originais: reducao.seriesOriginais, original_seg: reducao.originalSeg } } : {}),
      ...(extra ? { extra: { id: extra.id, modalidade: extra.modalidade, titulo: extra.titulo, grupos: extra.grupos, series_estimadas: extra.series_estimadas }, recuperacao: input.recuperacao ?? null } : {}),
    },
    series_planejadas: planejadas,
    tempo_estimado_seg: estimarPrescricao(doDia, temposDoTreino(treino)).totalSeg || null,
    pausado_seg: 0,
    checkin_pre: input.checkinPre ?? null,
    checkin_pre_nota: input.checkinPreNota ?? null,
    modo,
    tempo_disponivel_min: input.tempoDisponivelMin ?? null,
    extra_id: extra?.id ?? null,
    series_concluidas: 0,
    feedback_percepcao: null,
    feedback_comentario: null,
    origem: "app",
    created_at: agora,
    updated_at: agora,
  };
  const exercicios: SessionExercise[] = doDia.map((e, ordem) => ({
    id: uid(),
    session_id: sessao.id,
    exercicio_id: e.id,
    biblioteca_id: e.biblioteca_id ?? null,
    client_key: `ex:${e.id}`,
    ordem,
    nome: e.nome,
    nome_normalizado: normalizarNome(e.nome),
    grupo_muscular: e.grupo_muscular,
    series_planejadas: Math.max(0, e.series - (e.series_aquecimento ?? 0)),
    prescricao: { series: e.series, reps: e.reps, descanso_seg: e.descanso_seg, ie: e.ie, rir: e.rir, series_aquecimento: e.series_aquecimento, tecnica: e.tecnica, unilateral: e.unilateral, observacoes: e.observacoes, series_config: e.series_config ?? null },
    status: "pendente",
    observacao_aluno: null,
    created_at: agora,
  }));

  if (isDemoMode()) {
    const st = demoStore();
    st.sessions.push(sessao);
    st.sessionExercises.push(...exercicios);
    return montarCompleta(sessao, st.sessionExercises, st.sessionSets);
  }
  const db = await getDb();
  const { id: _id, created_at: _c, updated_at: _u, ...payload } = sessao;
  void _id; void _c; void _u;
  const { data: criada, error } = await db.from("training_sessions").insert(payload).select("*").single();
  if (error) {
    // corrida: outra aba criou com a mesma client_key
    if (error.code === "23505") {
      const { data } = await db.from("training_sessions").select("id").eq("aluno_id", alunoId).eq("client_key", input.clientKey).single();
      return (await getSessao(alunoId, data!.id))!;
    }
    throw new Error(`Não foi possível iniciar a sessão: ${error.message}`);
  }
  const { error: exErr } = await db.from("session_exercises").insert(
    exercicios.map(({ id: _i, created_at: _cc, nome_normalizado: _n, ...e }) => {
      void _i; void _cc; void _n;
      return { ...e, session_id: criada.id };
    })
  );
  if (exErr) throw new Error(`Falha ao preparar exercícios da sessão: ${exErr.message}`);
  return (await getSessao(alunoId, criada.id))!;
}

/** Registra/atualiza uma série. Mesma client_key → atualiza (nunca duplica). */
export async function registrarSerie(alunoId: string, sessionId: string, input: SerieInput): Promise<SessionSet> {
  const agora = new Date().toISOString();
  const valores = {
    serie: Math.max(1, Math.floor(input.serie)),
    tipo: input.tipo ?? "valida",
    carga_kg: input.carga_kg ?? null,
    reps: input.reps ?? null,
    rir: input.rir ?? null,
    rpe: input.rpe ?? null,
    tempo_seg: input.tempo_seg ?? null,
    lado: input.lado ?? null,
    desconforto: input.desconforto ?? null,
    observacoes: input.observacoes ?? null,
    concluida_em: input.concluida_em ?? agora,
  };

  if (isDemoMode()) {
    const st = demoStore();
    const s = st.sessions.find((x) => x.id === sessionId && x.aluno_id === alunoId);
    if (!s) throw new Error("Sessão não encontrada");
    if (s.status !== "em_andamento") throw new Error("Sessão já finalizada");
    const se = st.sessionExercises.find((x) => x.id === input.session_exercise_id && x.session_id === sessionId);
    if (!se) throw new Error("Exercício não pertence a esta sessão");
    let set = st.sessionSets.find((x) => x.session_id === sessionId && x.client_key === input.client_key);
    if (set) {
      Object.assign(set, valores);
    } else {
      set = { id: uid(), session_id: sessionId, session_exercise_id: se.id, client_key: input.client_key, created_at: agora, ...valores };
      st.sessionSets.push(set);
    }
    if (se.status === "pendente") se.status = "concluido";
    s.series_concluidas = st.sessionSets.filter((x) => x.session_id === sessionId && x.tipo !== "aquecimento").length;
    s.updated_at = agora;
    return set;
  }

  const db = await getDb();
  const { data: s } = await db.from("training_sessions").select("id, status").eq("id", sessionId).eq("aluno_id", alunoId).maybeSingle();
  if (!s) throw new Error("Sessão não encontrada");
  if (s.status !== "em_andamento") throw new Error("Sessão já finalizada");
  const { data: se } = await db.from("session_exercises").select("id, status").eq("id", input.session_exercise_id).eq("session_id", sessionId).maybeSingle();
  if (!se) throw new Error("Exercício não pertence a esta sessão");
  const { data, error } = await db
    .from("session_sets")
    .upsert({ session_id: sessionId, session_exercise_id: se.id, client_key: input.client_key, ...valores }, { onConflict: "session_id,client_key" })
    .select("*")
    .single();
  if (error) throw new Error(`Falha ao registrar série: ${error.message}`);
  if (se.status === "pendente") await db.from("session_exercises").update({ status: "concluido" }).eq("id", se.id);
  const { count } = await db.from("session_sets").select("id", { count: "exact", head: true }).eq("session_id", sessionId).neq("tipo", "aquecimento");
  await db.from("training_sessions").update({ series_concluidas: count ?? 0 }).eq("id", sessionId);
  return data as SessionSet;
}

export async function removerSerie(alunoId: string, sessionId: string, clientKey: string): Promise<boolean> {
  if (isDemoMode()) {
    const st = demoStore();
    const s = st.sessions.find((x) => x.id === sessionId && x.aluno_id === alunoId && x.status === "em_andamento");
    if (!s) return false;
    const idx = st.sessionSets.findIndex((x) => x.session_id === sessionId && x.client_key === clientKey);
    if (idx < 0) return false;
    st.sessionSets.splice(idx, 1);
    s.series_concluidas = st.sessionSets.filter((x) => x.session_id === sessionId && x.tipo !== "aquecimento").length;
    return true;
  }
  const db = await getDb();
  const { error, count } = await db.from("session_sets").delete({ count: "exact" }).eq("session_id", sessionId).eq("client_key", clientKey);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function atualizarExercicioSessao(alunoId: string, sessionId: string, sessionExerciseId: string, patch: { status?: SessionExerciseStatus; observacao_aluno?: string | null }): Promise<boolean> {
  if (isDemoMode()) {
    const st = demoStore();
    const s = st.sessions.find((x) => x.id === sessionId && x.aluno_id === alunoId);
    const se = st.sessionExercises.find((x) => x.id === sessionExerciseId && x.session_id === sessionId);
    if (!s || !se) return false;
    Object.assign(se, patch);
    return true;
  }
  const db = await getDb();
  const { data: s } = await db.from("training_sessions").select("id").eq("id", sessionId).eq("aluno_id", alunoId).maybeSingle();
  if (!s) return false;
  const { error, count } = await db.from("session_exercises").update(patch, { count: "exact" }).eq("id", sessionExerciseId).eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export type FinalizarInput = {
  status?: "concluida" | "abandonada";
  feedback_percepcao?: TrainingSession["feedback_percepcao"];
  feedback_comentario?: string | null;
  duracao_seg?: number | null;
  pausado_seg?: number | null;
};

/** Tempos efetivos do treino (salvos pelo montador); legado: só os ajustes do treino. */
function temposDoTreino(t: { tempos_efetivos?: Record<string, unknown> | null; tempos?: Record<string, unknown> | null }): Partial<ParametrosTempo> {
  return ((t.tempos_efetivos ?? t.tempos ?? {}) as Partial<ParametrosTempo>) ?? {};
}

export async function finalizarSessao(alunoId: string, sessionId: string, input: FinalizarInput = {}): Promise<SessaoCompleta> {
  const agora = new Date().toISOString();
  const status = input.status ?? "concluida";
  if (isDemoMode()) {
    const st = demoStore();
    const s = st.sessions.find((x) => x.id === sessionId && x.aluno_id === alunoId);
    if (!s) throw new Error("Sessão não encontrada");
    if (s.status === "em_andamento") {
      s.status = status;
      s.finalizado_em = agora;
      s.pausado_seg = input.pausado_seg ?? s.pausado_seg ?? 0;
      s.duracao_seg = input.duracao_seg ?? Math.max(0, Math.round((Date.now() - new Date(s.iniciado_em).getTime()) / 1000) - (s.pausado_seg ?? 0));
      s.series_concluidas = st.sessionSets.filter((x) => x.session_id === sessionId && x.tipo !== "aquecimento").length;
    }
    if (input.feedback_percepcao !== undefined) s.feedback_percepcao = input.feedback_percepcao;
    if (input.feedback_comentario !== undefined) s.feedback_comentario = input.feedback_comentario;
    s.updated_at = agora;
    const aluno = st.alunos.find((a) => a.id === alunoId);
    if (aluno && status === "concluida") aluno.ultimo_treino_em = agora;
    return montarCompleta(s, st.sessionExercises, st.sessionSets);
  }
  const db = await getDb();
  const { data: s } = await db.from("training_sessions").select("*").eq("id", sessionId).eq("aluno_id", alunoId).maybeSingle();
  if (!s) throw new Error("Sessão não encontrada");
  const patch: Record<string, unknown> = {};
  if (s.status === "em_andamento") {
    const { count } = await db.from("session_sets").select("id", { count: "exact", head: true }).eq("session_id", sessionId).neq("tipo", "aquecimento");
    patch.status = status;
    patch.finalizado_em = agora;
    // Duração realizada = tempo de relógio menos as pausas registradas pelo aluno.
    const pausado = input.pausado_seg ?? 0;
    patch.pausado_seg = pausado;
    patch.duracao_seg = input.duracao_seg ?? Math.max(0, Math.round((Date.now() - new Date(s.iniciado_em).getTime()) / 1000) - pausado);
    patch.series_concluidas = count ?? 0;
  }
  if (input.feedback_percepcao !== undefined) patch.feedback_percepcao = input.feedback_percepcao;
  if (input.feedback_comentario !== undefined) patch.feedback_comentario = input.feedback_comentario;
  const { error } = await db.from("training_sessions").update(patch).eq("id", sessionId).eq("aluno_id", alunoId);
  if (error) throw new Error(`Falha ao finalizar: ${error.message}`);
  if (status === "concluida") {
    // ultimo_treino_em: o aluno NÃO tem policy de update em alunos; usamos RPC segura se existir, senão ignoramos.
    await db.rpc("marcar_ultimo_treino", { p_aluno_id: alunoId }).then(() => undefined, () => undefined);
  }
  return (await getSessao(alunoId, sessionId))!;
}
