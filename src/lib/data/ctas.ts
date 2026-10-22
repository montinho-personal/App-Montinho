// Modo Visitante — eventos dos convites para o WhatsApp (0057). RLS: o visitante lê/grava os próprios.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import type { EventoCta } from "@/lib/visitante/ctas";

type Demo = Array<EventoCta & { aluno_id: string }>;
function demo(): Demo {
  const g = globalThis as unknown as { __montinhoCtas?: Demo };
  g.__montinhoCtas ??= [];
  return g.__montinhoCtas;
}

export async function eventosCta(alunoId: string, dias = 15): Promise<EventoCta[]> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  if (isDemoMode()) return demo().filter((e) => e.aluno_id === alunoId && e.created_at >= desde);
  const db = await getDb();
  const { data } = await db.from("cta_eventos").select("cta, tipo, created_at").eq("aluno_id", alunoId).gte("created_at", desde).order("created_at", { ascending: false }).limit(300);
  return (data ?? []) as EventoCta[];
}

export async function registrarEventoCta(alunoId: string, e: { cta: string; tipo: EventoCta["tipo"]; tela: string }): Promise<void> {
  if (isDemoMode()) {
    demo().push({ aluno_id: alunoId, cta: e.cta, tipo: e.tipo, created_at: new Date().toISOString() });
    return;
  }
  const db = await getDb();
  await db.from("cta_eventos").insert({ aluno_id: alunoId, cta: e.cta, tipo: e.tipo, tela: e.tela });
}
