// “Dispensar” no Celebrar conquistas (0120): tira da lista sem apagar o troféu.
// Estado guardado em acompanhamento_alertas (origem 'celebrar'); só o personal.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";

const g = globalThis as unknown as { __demoDispensadas?: Set<string> };
const demo = () => (g.__demoDispensadas ??= new Set());
const chave = (conquistaId: string) => `celebrar:${conquistaId}`;

/** Ids das conquistas dispensadas (vazio se a 0120 ainda não estiver no banco). */
export async function conquistasDispensadas(): Promise<Set<string>> {
  if (isDemoMode()) return new Set(demo());
  const db = await getDb();
  const { data, error } = await db.from("acompanhamento_alertas").select("chave").eq("origem", "celebrar").eq("estado", "dispensado").limit(5000);
  if (error) return new Set();
  return new Set((data ?? []).map((r: { chave: string }) => r.chave.replace(/^celebrar:/, "")));
}

/** Dispensa (ou volta para a lista) várias conquistas de uma vez. */
export async function dispensarConquistas(itens: Array<{ alunoId: string; conquistaId: string }>, desfazer = false): Promise<number> {
  if (!itens.length) return 0;
  if (isDemoMode()) {
    for (const i of itens) {
      if (desfazer) demo().delete(i.conquistaId);
      else demo().add(i.conquistaId);
    }
    return itens.length;
  }
  const db = await getDb();
  if (desfazer) {
    const { error } = await db.from("acompanhamento_alertas").delete().eq("origem", "celebrar").in("chave", itens.map((i) => chave(i.conquistaId)));
    if (error) throw new Error(error.message);
    return itens.length;
  }
  const linhas = itens.map((i) => ({ aluno_id: i.alunoId, origem: "celebrar", chave: chave(i.conquistaId), estado: "dispensado", updated_at: new Date().toISOString() }));
  const { error } = await db.from("acompanhamento_alertas").upsert(linhas, { onConflict: "aluno_id,chave" });
  if (error) throw new Error(/origem_check/.test(error.message) ? "O “Dispensar” está sendo ativado no app. Tente de novo daqui a pouco." : error.message);
  return itens.length;
}
