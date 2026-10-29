// Treinos feitos (29/10/2026): histórico treino a treino com as anotações, para o
// personal (por aluno e de todos os alunos). Leitura pela RLS (o personal lê
// tudo; nada de service role). Busca as séries em lotes: a API do banco devolve
// no máximo 1.000 linhas por pedido e um histórico grande passaria disso.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import { listAlunos } from "@/lib/db";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import type { SessionExercise, SessionSet, TrainingSession } from "@/lib/supabase/types-sessoes";
import { treinosFeitos, type TreinoFeito } from "@/lib/historico/treinos-feitos";

function montar(sessoes: TrainingSession[], exs: SessionExercise[], sets: SessionSet[]): SessaoCompleta[] {
  const setsPorEx = new Map<string, SessionSet[]>();
  for (const x of sets) setsPorEx.set(x.session_exercise_id, [...(setsPorEx.get(x.session_exercise_id) ?? []), x]);
  const exPorSessao = new Map<string, SessionExercise[]>();
  for (const e of exs) exPorSessao.set(e.session_id, [...(exPorSessao.get(e.session_id) ?? []), e]);
  return sessoes.map((s) => ({ ...s, exercicios: (exPorSessao.get(s.id) ?? []).map((e) => ({ ...e, series: setsPorEx.get(e.id) ?? [] })) }));
}

async function carregar(filtro: { alunoId?: string; desde?: string; limite: number }): Promise<SessaoCompleta[]> {
  if (isDemoMode()) {
    const st = demoStore();
    const ss = st.sessions
      .filter((s) => (!filtro.alunoId || s.aluno_id === filtro.alunoId) && (!filtro.desde || s.iniciado_em >= filtro.desde))
      .sort((a, b) => (a.iniciado_em < b.iniciado_em ? 1 : -1))
      .slice(0, filtro.limite);
    return montar(ss, st.sessionExercises, st.sessionSets);
  }
  const db = await getDb();
  let q = db.from("training_sessions").select("*").order("iniciado_em", { ascending: false }).limit(filtro.limite);
  if (filtro.alunoId) q = q.eq("aluno_id", filtro.alunoId);
  if (filtro.desde) q = q.gte("iniciado_em", filtro.desde);
  const { data: sessoes } = await q;
  const lista = (sessoes ?? []) as TrainingSession[];
  const exs: SessionExercise[] = [];
  const sets: SessionSet[] = [];
  for (let i = 0; i < lista.length; i += 25) {
    const ids = lista.slice(i, i + 25).map((s) => s.id);
    const [e, x] = await Promise.all([db.from("session_exercises").select("*").in("session_id", ids).limit(1000), db.from("session_sets").select("*").in("session_id", ids).limit(1000)]);
    exs.push(...((e.data ?? []) as SessionExercise[]));
    sets.push(...((x.data ?? []) as SessionSet[]));
  }
  return montar(lista, exs, sets);
}

/** Histórico de um aluno (o personal confere o acesso na página). */
export async function treinosFeitosDoAluno(alunoId: string, limite = 120): Promise<TreinoFeito[]> {
  return treinosFeitos(await carregar({ alunoId, limite }));
}

export type TreinoFeitoComAluno = TreinoFeito & { alunoNome: string; visitante: boolean };

/** Treinos de todos os alunos nos últimos dias (painel do personal). */
export async function treinosFeitosRecentes(dias = 7): Promise<TreinoFeitoComAluno[]> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const [sessoes, alunos] = await Promise.all([carregar({ desde, limite: 400 }), listAlunos({ incluirVisitantes: true })]);
  const porId = new Map(alunos.map((a) => [a.id, a]));
  return treinosFeitos(sessoes)
    .filter((t) => porId.has(t.alunoId))
    .map((t) => {
      const a = porId.get(t.alunoId)!;
      return { ...t, alunoNome: a.profile?.nome ?? "Aluno", visitante: (a as { modalidade?: string }).modalidade === "visitante" };
    });
}
