// Dados para o “É impossível dar errado!” (lib/chalala/confianca): treinos já
// concluídos, último treino e quando a ficha atual foi publicada. Leitura com RLS.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";

export type DadosConfianca = { concluidas: number; ultimaConcluida: string | null; publicadaEm: string | null };

export async function dadosConfianca(alunoId: string): Promise<DadosConfianca> {
  if (isDemoMode()) {
    const st = demoStore();
    const feitas = st.sessions.filter((s) => s.aluno_id === alunoId && s.status === "concluida").sort((a, b) => (a.iniciado_em < b.iniciado_em ? 1 : -1));
    const versao = st.versoes.filter((v) => v.aluno_id === alunoId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    return { concluidas: feitas.length, ultimaConcluida: feitas[0]?.finalizado_em ?? feitas[0]?.iniciado_em ?? null, publicadaEm: versao?.created_at ?? null };
  }
  const db = await getDb();
  const [ult, total, versao] = await Promise.all([
    db.from("training_sessions").select("iniciado_em, finalizado_em").eq("aluno_id", alunoId).eq("status", "concluida").order("iniciado_em", { ascending: false }).limit(1).maybeSingle(),
    db.from("training_sessions").select("id", { count: "exact", head: true }).eq("aluno_id", alunoId).eq("status", "concluida"),
    db.from("programa_versoes").select("created_at").eq("aluno_id", alunoId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const u = ult.data as { iniciado_em: string; finalizado_em: string | null } | null;
  return { concluidas: total.count ?? 0, ultimaConcluida: u?.finalizado_em ?? u?.iniciado_em ?? null, publicadaEm: (versao.data as { created_at: string } | null)?.created_at ?? null };
}
