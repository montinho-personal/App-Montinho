// ============================================================================
// Resumo do histórico de outro app — leitura e gravação pelo cliente com RLS
// (personal grava; aluno só lê o próprio). Gravação idempotente pela chave
// única (aluno, data, exercício, fonte): repetir a importação não duplica.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { diasDeTreinoDoResumo, exerciciosDoDia, linhasParaGravar, type HistoricoResumo, type ImportacaoResumo } from "@/lib/historico/resumo";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { SessionExercise, SessionSet, TrainingSession, TreinoLetra } from "@/lib/supabase/types-sessoes";

function demo(): HistoricoResumo[] {
  const g = globalThis as unknown as { __montinhoHistoricoResumo?: HistoricoResumo[] };
  g.__montinhoHistoricoResumo ??= [];
  return g.__montinhoHistoricoResumo;
}

const chave = (r: Pick<HistoricoResumo, "aluno_id" | "data" | "nome_normalizado" | "fonte">) => `${r.aluno_id}|${r.data}|${r.nome_normalizado}|${r.fonte}`;

export async function listarHistoricoResumo(alunoId: string): Promise<HistoricoResumo[]> {
  if (isDemoMode()) return demo().filter((r) => r.aluno_id === alunoId).sort((a, b) => (a.data < b.data ? -1 : 1));
  const db = await getDb();
  const { data } = await db.from("historico_resumo").select("*").eq("aluno_id", alunoId).order("data").limit(5000);
  return ((data ?? []) as HistoricoResumo[]).map((r) => ({ ...r, carga_max_kg: r.carga_max_kg == null ? null : Number(r.carga_max_kg), volume_kg: r.volume_kg == null ? null : Number(r.volume_kg) }));
}

/** Grava as linhas que ainda não existem. Retorna quantas eram novas. */
export async function importarHistoricoResumo(alunoId: string, imp: ImportacaoResumo): Promise<{ novas: number; total: number }> {
  const linhas = linhasParaGravar(imp).map((l) => ({ ...l, aluno_id: alunoId }));
  const existentes = new Set((await listarHistoricoResumo(alunoId)).map(chave));
  const faltam = linhas.filter((l) => !existentes.has(chave(l)));
  if (!faltam.length) return { novas: 0, total: linhas.length };
  if (isDemoMode()) {
    demo().push(...faltam.map((l) => ({ ...l, id: uid(), created_at: new Date().toISOString() })));
    return { novas: faltam.length, total: linhas.length };
  }
  const db = await getDb();
  const { error } = await db.from("historico_resumo").upsert(faltam, { onConflict: "aluno_id,data,nome_normalizado,fonte", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return { novas: faltam.length, total: linhas.length };
}

/**
 * Registra os dias do resumo como sessões concluídas importadas (origem
 * "importado", contam para aderência e conquistas). Sem séries detalhadas.
 * Idempotente pela client_key (hist:<importação>:<data>).
 */
type TreinoBase = { id: string; letra: string; nome: string; series: number; exercicios: Array<{ id: string; nome: string; series: number; grupo_muscular: string | null; biblioteca_id?: string | null; tecnica?: string | null }> };

export async function registrarDiasDeTreino(alunoId: string, imp: ImportacaoResumo, treinos: TreinoBase[]): Promise<{ novos: number; total: number; seriesCompletadas: number }> {
  const r = await criarSessoesDosDias(alunoId, imp, treinos);
  const seriesCompletadas = await completarSeriesDosDias(alunoId, imp, treinos);
  return { ...r, seriesCompletadas };
}

async function criarSessoesDosDias(alunoId: string, imp: ImportacaoResumo, treinos: TreinoBase[]): Promise<{ novos: number; total: number }> {
  const porLetra = new Map(treinos.map((t) => [t.letra, t]));
  const dias = diasDeTreinoDoResumo(imp, Object.fromEntries(treinos.map((t) => [t.letra, t.series])));
  const agora = new Date().toISOString();
  const linhas = dias.map((d) => {
    const t = porLetra.get(d.letra)!;
    const quando = `${d.data}T12:00:00-03:00`;
    return {
      aluno_id: alunoId, treino_id: t.id, letra: d.letra as TreinoLetra, nome_treino: t.nome, client_key: d.clientKey, status: "concluida" as const,
      iniciado_em: quando, finalizado_em: quando, series_planejadas: d.seriesPlanejadas, series_concluidas: d.seriesConcluidas,
      origem: "importado" as const, conta_aderencia: true, snapshot: { fonte: imp.fonte, importacao: imp.id, resumo: true },
    };
  });
  if (isDemoMode()) {
    const st = demoStore();
    const ja = new Set(st.sessions.filter((s) => s.aluno_id === alunoId).map((s) => s.client_key));
    const novas = linhas.filter((l) => !ja.has(l.client_key));
    st.sessions.push(...novas.map((l) => ({ ...l, id: uid(), programa_versao_id: null, duracao_seg: null, feedback_percepcao: null, feedback_comentario: null, created_at: agora, updated_at: agora }) as TrainingSession));
    return { novos: novas.length, total: linhas.length };
  }
  const db = await getDb();
  const { data: existentes } = await db.from("training_sessions").select("client_key").eq("aluno_id", alunoId).like("client_key", `hist:${imp.id}:%`);
  const ja = new Set((existentes ?? []).map((r: { client_key: string }) => r.client_key));
  const novas = linhas.filter((l) => !ja.has(l.client_key));
  if (!novas.length) {
    await atualizarUltimoTreino(alunoId, linhas.map((l) => l.finalizado_em));
    return { novos: 0, total: linhas.length };
  }
  const { error } = await db.from("training_sessions").upsert(novas, { onConflict: "aluno_id,client_key", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  await atualizarUltimoTreino(alunoId, linhas.map((l) => l.finalizado_em));
  return { novos: novas.length, total: linhas.length };
}

const OBS_SERIE = "Importado do app anterior (resumo do dia): série feita, sem carga/repetições por série.";

/**
 * Para cada dia importado ainda sem exercícios: cria os exercícios do treino
 * da letra e as séries feitas (sem carga nem repetições), para o volume
 * semanal realizado. Idempotente: dia que já tem exercícios é pulado.
 */
async function completarSeriesDosDias(alunoId: string, imp: ImportacaoResumo, treinos: TreinoBase[]): Promise<number> {
  const porLetra = new Map(treinos.map((t) => [t.letra, t]));
  const prefixo = `hist:${imp.id}:`;
  const montar = (sessao: { id: string; letra: string | null; client_key: string; iniciado_em: string }) => {
    const t = sessao.letra ? porLetra.get(sessao.letra) : undefined;
    if (!t) return null;
    const data = sessao.client_key.slice(prefixo.length);
    const exs = exerciciosDoDia(imp.linhas, data, t).map((e) => ({ ...e, seId: uid() }));
    const exercicios = exs.map((e) => ({
      id: e.seId, session_id: sessao.id, exercicio_id: e.exercicioId, biblioteca_id: e.bibliotecaId, client_key: `hist:${e.exercicioId}`, ordem: e.ordem, nome: e.nome,
      grupo_muscular: e.grupo as GrupoMuscular | null, series_planejadas: e.planejadas, prescricao: { fonte: imp.fonte, resumo: true }, status: (e.feitas > 0 ? "concluido" : "pulado") as SessionExercise["status"], observacao_aluno: null,
    }));
    const sets = exs.flatMap((e) => Array.from({ length: e.feitas }, (_, i) => ({
      session_id: sessao.id, session_exercise_id: e.seId, client_key: `hist:${e.exercicioId}:${i + 1}`, serie: i + 1, tipo: e.tipo as SessionSet["tipo"],
      carga_kg: null, reps: null, observacoes: OBS_SERIE, concluida_em: sessao.iniciado_em,
    })));
    return { exercicios, sets };
  };

  if (isDemoMode()) {
    const st = demoStore();
    let n = 0;
    for (const s of st.sessions.filter((x) => x.aluno_id === alunoId && x.client_key.startsWith(prefixo))) {
      if (st.sessionExercises.some((e) => e.session_id === s.id)) continue;
      const m = montar(s);
      if (!m) continue;
      const agora = new Date().toISOString();
      st.sessionExercises.push(...m.exercicios.map((e) => ({ ...e, created_at: agora }) as SessionExercise));
      st.sessionSets.push(...m.sets.map((x) => ({ ...x, id: uid(), rir: null, rpe: null, tempo_seg: null, lado: null, desconforto: null, created_at: agora }) as SessionSet));
      n += m.sets.length;
    }
    return n;
  }
  const db = await getDb();
  const { data: sessoes } = await db.from("training_sessions").select("id, letra, client_key, iniciado_em").eq("aluno_id", alunoId).like("client_key", `${prefixo}%`);
  if (!sessoes?.length) return 0;
  const { data: comEx } = await db.from("session_exercises").select("session_id").in("session_id", sessoes.map((s: { id: string }) => s.id));
  const ja = new Set((comEx ?? []).map((r: { session_id: string }) => r.session_id));
  let n = 0;
  for (const s of sessoes as Array<{ id: string; letra: string | null; client_key: string; iniciado_em: string }>) {
    if (ja.has(s.id)) continue;
    const m = montar(s);
    if (!m) continue;
    const { error: e1 } = await db.from("session_exercises").insert(m.exercicios);
    if (e1) throw new Error(e1.message);
    if (m.sets.length) {
      const { error: e2 } = await db.from("session_sets").insert(m.sets);
      if (e2) throw new Error(e2.message);
    }
    n += m.sets.length;
  }
  return n;
}

/** “Último treino” da lista de alunos: só avança, nunca volta no tempo. */
async function atualizarUltimoTreino(alunoId: string, datas: string[]) {
  if (!datas.length) return;
  const ultimo = new Date(Math.max(...datas.map((d) => new Date(d).getTime()))).toISOString();
  const db = await getDb();
  const { data: a } = await db.from("alunos").select("ultimo_treino_em").eq("id", alunoId).maybeSingle();
  if (a?.ultimo_treino_em && new Date(a.ultimo_treino_em).getTime() >= new Date(ultimo).getTime()) return;
  await db.from("alunos").update({ ultimo_treino_em: ultimo }).eq("id", alunoId);
}
