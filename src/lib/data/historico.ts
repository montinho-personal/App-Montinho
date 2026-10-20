// ============================================================================
// Resumo do histórico de outro app — leitura e gravação pelo cliente com RLS
// (personal grava; aluno só lê o próprio). Gravação idempotente pela chave
// única (aluno, data, exercício, fonte): repetir a importação não duplica.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { uid } from "@/lib/mock/store";
import { linhasParaGravar, type HistoricoResumo, type ImportacaoResumo } from "@/lib/historico/resumo";

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
