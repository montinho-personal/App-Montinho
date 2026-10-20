// Preferências pessoais do treinador (hoje: padrões de tempo do treino).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import type { ParametrosTempo } from "@/lib/tempo/estimar";

type DemoPrefs = Map<string, Partial<ParametrosTempo>>;
function demo(): DemoPrefs {
  const g = globalThis as unknown as { __montinhoPrefs?: DemoPrefs };
  g.__montinhoPrefs ??= new Map();
  return g.__montinhoPrefs;
}

export async function lerTemposTreinador(userId: string): Promise<Partial<ParametrosTempo>> {
  if (isDemoMode()) return demo().get(userId) ?? {};
  const db = await getDb();
  const { data } = await db.from("preferencias_treinador").select("tempos").eq("profile_id", userId).maybeSingle();
  return (data?.tempos as Partial<ParametrosTempo> | null) ?? {};
}

export async function salvarTemposTreinador(userId: string, tempos: Partial<ParametrosTempo>): Promise<void> {
  if (isDemoMode()) {
    demo().set(userId, tempos);
    return;
  }
  const db = await getDb();
  const { error } = await db.from("preferencias_treinador").upsert({ profile_id: userId, tempos, atualizado_em: new Date().toISOString() }, { onConflict: "profile_id" });
  if (error) throw new Error(error.message);
}
