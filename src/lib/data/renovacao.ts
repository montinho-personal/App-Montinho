// Números verdadeiros da pessoa para a mensagem de renovação (lib/aluno/renovacao). Leitura com RLS.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import type { ResumoRenovacao } from "@/lib/aluno/renovacao";

export async function resumoParaRenovacao(alunoId: string): Promise<ResumoRenovacao | null> {
  try {
    if (isDemoMode()) {
      const st = demoStore();
      const treinos = st.sessions.filter((s) => s.aluno_id === alunoId && s.status === "concluida").length;
      const trofeus = ((st as unknown as { conquistas?: Array<{ aluno_id: string; codigo: string }> }).conquistas ?? []).filter((c) => c.aluno_id === alunoId && c.codigo !== "relatorio_mensal").length;
      return { treinos, trofeus, semanas: 0 };
    }
    const db = await getDb();
    const [t, c] = await Promise.all([
      db.from("training_sessions").select("id", { count: "exact", head: true }).eq("aluno_id", alunoId).eq("status", "concluida"),
      db.from("conquistas_aluno").select("id", { count: "exact", head: true }).eq("aluno_id", alunoId).neq("codigo", "relatorio_mensal"),
    ]);
    return { treinos: t.count ?? 0, trofeus: c.count ?? 0, semanas: 0 };
  } catch {
    return null;
  }
}
