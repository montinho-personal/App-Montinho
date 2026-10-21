// Alternativas de troca que o personal ocultou para um aluno (migration 0034).
// Valem no montador e no "Trocar" do treino do aluno. Sempre pelo cliente com RLS.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import type { AlternativaOculta } from "@/lib/supabase/types-sessoes";

export type ParOculto = { exercicio_id: string; alternativa_id: string };

function demo(): Array<ParOculto & { aluno_id: string }> {
  const g = globalThis as unknown as { __montinhoOcultas?: Array<ParOculto & { aluno_id: string }> };
  g.__montinhoOcultas ??= [];
  return g.__montinhoOcultas;
}

export async function listarAlternativasOcultas(alunoId: string): Promise<ParOculto[]> {
  if (isDemoMode()) return demo().filter((o) => o.aluno_id === alunoId).map(({ exercicio_id, alternativa_id }) => ({ exercicio_id, alternativa_id }));
  const db = await getDb();
  const { data } = await db.from("alternativas_ocultas").select("exercicio_id, alternativa_id").eq("aluno_id", alunoId);
  return ((data as Pick<AlternativaOculta, "exercicio_id" | "alternativa_id">[] | null) ?? []).map((o) => ({ exercicio_id: o.exercicio_id, alternativa_id: o.alternativa_id }));
}

export async function definirAlternativaOculta(alunoId: string, par: ParOculto, oculta: boolean): Promise<void> {
  if (isDemoMode()) {
    const lista = demo();
    const resto = lista.filter((o) => !(o.aluno_id === alunoId && o.exercicio_id === par.exercicio_id && o.alternativa_id === par.alternativa_id));
    lista.splice(0, lista.length, ...resto, ...(oculta ? [{ aluno_id: alunoId, ...par }] : []));
    return;
  }
  const db = await getDb();
  const { error } = oculta
    ? await db.from("alternativas_ocultas").upsert({ aluno_id: alunoId, ...par }, { onConflict: "aluno_id,exercicio_id,alternativa_id", ignoreDuplicates: true })
    : await db.from("alternativas_ocultas").delete().eq("aluno_id", alunoId).eq("exercicio_id", par.exercicio_id).eq("alternativa_id", par.alternativa_id);
  if (error) throw new Error(error.message);
}

/** Conjunto "exercicio_id|alternativa_id" para filtrar listas rapidamente. */
export const chaveOculta = (exercicioId: string, alternativaId: string) => `${exercicioId}|${alternativaId}`;
