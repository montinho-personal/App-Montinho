// ============================================================================
// Estratégia do aluno (importada do Montinho Strategy) — RLS: personal grava,
// aluno lê a própria. Cada importação é uma versão nova; vale a mais recente.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { uid } from "@/lib/mock/store";
import type { EstrategiaImportada } from "@/lib/estrategia/ler";

export type EstrategiaRow = { id: string; aluno_id: string; titulo: string | null; data_relatorio: string | null; dados: EstrategiaImportada; arquivo_nome: string | null; plano_criado: boolean; created_at: string };

function demo(): EstrategiaRow[] {
  const g = globalThis as unknown as { __montinhoEstrategias?: EstrategiaRow[] };
  g.__montinhoEstrategias ??= [];
  return g.__montinhoEstrategias;
}

export async function estrategiaVigente(alunoId: string): Promise<EstrategiaRow | null> {
  if (isDemoMode()) return demo().filter((r) => r.aluno_id === alunoId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null;
  const db = await getDb();
  const { data } = await db.from("estrategias_aluno").select("*").eq("aluno_id", alunoId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as EstrategiaRow | null) ?? null;
}

export async function gravarEstrategia(alunoId: string, e: EstrategiaImportada, arquivoNome: string | null, planoCriado: boolean): Promise<EstrategiaRow> {
  const linha = { aluno_id: alunoId, titulo: e.titulo, data_relatorio: e.data, dados: e, arquivo_nome: arquivoNome, plano_criado: planoCriado };
  if (isDemoMode()) {
    const r = { ...linha, id: uid(), created_at: new Date().toISOString() };
    demo().push(r);
    return r;
  }
  const db = await getDb();
  const { data, error } = await db.from("estrategias_aluno").insert(linha).select("*").single();
  if (error) throw new Error(error.message);
  return data as EstrategiaRow;
}
