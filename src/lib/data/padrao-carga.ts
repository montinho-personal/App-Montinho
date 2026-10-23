// Padrão de carga do aluno (0070): anilhas e halteres, “total” ou “por lado”.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { PADRAO_CARGA_VAZIO, type ModoCarga, type PadraoCarga } from "@/lib/treino/padrao-carga";

function demo(): Map<string, PadraoCarga> {
  const g = globalThis as unknown as { __montinhoPadraoCarga?: Map<string, PadraoCarga> };
  g.__montinhoPadraoCarga ??= new Map();
  return g.__montinhoPadraoCarga;
}

const modo = (v: unknown): ModoCarga | null => (v === "total" || v === "por_lado" ? v : null);

export async function getPadraoCarga(alunoId: string): Promise<PadraoCarga> {
  if (isDemoMode()) return demo().get(alunoId) ?? { ...PADRAO_CARGA_VAZIO };
  const db = await getDb();
  const { data, error } = await db.from("preferencias_carga").select("anilhas, halteres").eq("aluno_id", alunoId).maybeSingle();
  // Antes da 0070 a tabela não existe: segue sem padrão.
  if (error || !data) return { ...PADRAO_CARGA_VAZIO };
  return { anilhas: modo(data.anilhas), halteres: modo(data.halteres) };
}

export async function salvarPadraoCarga(alunoId: string, mudanca: Partial<PadraoCarga>): Promise<PadraoCarga> {
  const atual = await getPadraoCarga(alunoId);
  const novo: PadraoCarga = { ...atual, ...mudanca };
  if (isDemoMode()) {
    demo().set(alunoId, novo);
    return novo;
  }
  const db = await getDb();
  const { error } = await db.from("preferencias_carga").upsert({ aluno_id: alunoId, anilhas: novo.anilhas, halteres: novo.halteres, atualizado_em: new Date().toISOString() }, { onConflict: "aluno_id" });
  if (error) throw new Error(error.message);
  return novo;
}
