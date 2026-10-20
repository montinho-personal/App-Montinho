// ============================================================================
// Resumo do histórico de outro app — leitura e gravação pelo cliente com RLS
// (personal grava; aluno só lê o próprio). Gravação idempotente pela chave
// única (aluno, data, exercício, fonte): repetir a importação não duplica.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { diasDeTreinoDoResumo, linhasParaGravar, type HistoricoResumo, type ImportacaoResumo } from "@/lib/historico/resumo";
import type { TrainingSession, TreinoLetra } from "@/lib/supabase/types-sessoes";

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
export async function registrarDiasDeTreino(alunoId: string, imp: ImportacaoResumo, treinos: Array<{ id: string; letra: string; nome: string; series: number }>): Promise<{ novos: number; total: number }> {
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
  if (!novas.length) return { novos: 0, total: linhas.length };
  const { error } = await db.from("training_sessions").upsert(novas, { onConflict: "aluno_id,client_key", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return { novos: novas.length, total: linhas.length };
}
