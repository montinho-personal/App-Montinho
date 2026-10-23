// ============================================================================
// Treino livre (freestyle) — gravação. Mesmas tabelas do treino comum: a
// sessão nasce sem treino_id (snapshot.livre) e os exercícios entram um a um,
// na hora em que a pessoa escolhe. Séries e finalização usam as rotas comuns
// (/api/sessoes/[id]/series e PATCH /api/sessoes/[id]). Cliente com RLS: o
// aluno só escreve nas próprias sessões; acesso vencido não inicia (0052).
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { normalizarNome } from "@/lib/grupos";
import { NOME_TREINO_LIVRE, ehSessaoLivre, snapshotLivre } from "@/lib/treino/livre";
import type { Tecnica } from "@/lib/volume/calcular";
import type { SessionExercise, TrainingSession } from "@/lib/supabase/types-sessoes";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import { getSessao, getSessaoEmAndamento, gravarSessaoNova, type SessaoCompleta } from "./sessoes";

/** Começa um treino livre (ou devolve o que já está em andamento). */
/** Como treino extra: registrado à parte (não conta na meta semanal), com o “como está o corpo” do extra. */
export type ExtraLivre = { corpo: "bem" | "cansado" | "dor_leve" | "dor_moderada" };

export async function iniciarSessaoLivre(alunoId: string, clientKey: string, opts: { extra?: ExtraLivre | null } = {}): Promise<SessaoCompleta> {
  const atual = await getSessaoEmAndamento(alunoId);
  if (atual) {
    if (ehSessaoLivre(atual)) return atual;
    throw new Error("Você tem um treino em andamento. Termine ele antes de começar um treino livre.");
  }
  const agora = new Date().toISOString();
  const sessao: TrainingSession = {
    id: uid(),
    aluno_id: alunoId,
    treino_id: null,
    programa_versao_id: null,
    letra: null,
    nome_treino: opts.extra ? `Extra · ${NOME_TREINO_LIVRE}` : NOME_TREINO_LIVRE,
    client_key: clientKey,
    status: "em_andamento",
    iniciado_em: agora,
    finalizado_em: null,
    duracao_seg: null,
    snapshot: { ...snapshotLivre(), ...(opts.extra ? { extra: { id: null, livre: true, modalidade: "resistido", titulo: `Extra · ${NOME_TREINO_LIVRE}` }, recuperacao: opts.extra.corpo } : {}) },
    series_planejadas: 0,
    tempo_estimado_seg: null,
    pausado_seg: 0,
    checkin_pre: opts.extra ? (opts.extra.corpo === "cansado" ? "cansado" : opts.extra.corpo === "bem" ? "muito_bem" : "desconforto") : null,
    checkin_pre_nota: null,
    modo: opts.extra ? "extra" : "normal",
    tempo_disponivel_min: null,
    extra_id: null,
    series_concluidas: 0,
    feedback_percepcao: null,
    feedback_comentario: null,
    origem: "app",
    created_at: agora,
    updated_at: agora,
  };
  return gravarSessaoNova(alunoId, clientKey, sessao, []);
}

async function exigirLivreEmAndamento(alunoId: string, sessionId: string): Promise<SessaoCompleta> {
  const s = await getSessao(alunoId, sessionId);
  if (!s || !ehSessaoLivre(s)) throw new Error("Treino livre não encontrado");
  if (s.status !== "em_andamento") throw new Error("Este treino já foi finalizado");
  return s;
}

/** Entra um exercício no treino livre: da biblioteca (nome e músculo vêm dela) ou com o nome da pessoa. */
export async function adicionarExercicioLivre(alunoId: string, sessionId: string, input: { clientKey: string; item: ItemBiblioteca | null; nomeLivre: string | null; tecnica: Tecnica }): Promise<SessionExercise> {
  const s = await exigirLivreEmAndamento(alunoId, sessionId);
  const chave = `livre:${input.clientKey}`;
  const repetido = s.exercicios.find((e) => e.client_key === chave);
  if (repetido) return repetido;
  if (s.exercicios.length >= 30) throw new Error("Limite de 30 exercícios por treino");
  const nome = input.item?.nome ?? (input.nomeLivre ?? "").trim().slice(0, 60);
  if (nome.length < 2) throw new Error("Dê um nome ao exercício");
  const agora = new Date().toISOString();
  const novo: SessionExercise = {
    id: uid(),
    session_id: sessionId,
    exercicio_id: null,
    // Item do catálogo ainda não sincronizado (cat-…) não tem linha no banco.
    biblioteca_id: input.item && !input.item.id.startsWith("cat-") ? input.item.id : null,
    client_key: chave,
    ordem: s.exercicios.length,
    nome,
    nome_normalizado: normalizarNome(nome),
    grupo_muscular: input.item?.grupo ?? null,
    series_planejadas: 0,
    prescricao: { livre: true, series: 0, reps: null, descanso_seg: null, tecnica: input.tecnica, observacoes: null },
    status: "pendente",
    observacao_aluno: null,
    created_at: agora,
  };
  if (isDemoMode()) {
    demoStore().sessionExercises.push(novo);
    return novo;
  }
  const db = await getDb();
  const { id: _i, created_at: _c, nome_normalizado: _n, ...linha } = novo;
  void _i; void _c; void _n;
  const { data, error } = await db.from("session_exercises").insert(linha).select("*").single();
  if (error) throw new Error(`Não foi possível adicionar o exercício: ${error.message}`);
  return data as SessionExercise;
}

/** Muda a técnica e/ou a anotação de um exercício do treino livre. */
export async function ajustarExercicioLivre(alunoId: string, sessionId: string, seId: string, patch: { tecnica?: Tecnica; observacao?: string | null }): Promise<boolean> {
  const s = await exigirLivreEmAndamento(alunoId, sessionId);
  const se = s.exercicios.find((e) => e.id === seId);
  if (!se) return false;
  const mudar: Partial<SessionExercise> = {};
  if (patch.tecnica) mudar.prescricao = { ...((se.prescricao as Record<string, unknown> | null) ?? {}), tecnica: patch.tecnica };
  if (patch.observacao !== undefined) mudar.observacao_aluno = patch.observacao?.trim().slice(0, 300) || null;
  if (isDemoMode()) {
    const alvo = demoStore().sessionExercises.find((e) => e.id === seId && e.session_id === sessionId);
    if (alvo) Object.assign(alvo, mudar);
    return !!alvo;
  }
  const db = await getDb();
  const { error, count } = await db.from("session_exercises").update(mudar, { count: "exact" }).eq("id", seId).eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
