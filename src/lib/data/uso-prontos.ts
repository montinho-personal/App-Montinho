// Painel do personal: quantas pessoas estão fazendo cada treino pronto.
// Cliente com RLS (só o treinador lê os treinos e sessões de todos).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import { dataLocal } from "@/lib/aderencia/calcular";
import { usoDosProntos, type SessaoDoTreino, type TreinoMarcado, type UsoDoPronto } from "@/lib/visitante/uso-prontos";
import { MARCA_MONTE_IA } from "@/lib/visitante/treinos-prontos";

const ehMarcado = (obs: string | null | undefined) => !!obs && (obs.startsWith("Treino pronto do Montinho: ") || obs.trim() === MARCA_MONTE_IA);

export async function usoDosTreinosProntos(): Promise<UsoDoPronto[]> {
  const hoje = dataLocal(new Date());
  if (isDemoMode()) {
    const s = demoStore();
    const treinos = s.treinos.filter((t) => ehMarcado(t.observacoes)) as unknown as TreinoMarcado[];
    const ids = new Set(treinos.map((t) => t.id));
    const sessoes: SessaoDoTreino[] = s.sessions.filter((x) => x.treino_id && ids.has(x.treino_id)).map((x) => ({ aluno_id: x.aluno_id, treino_id: x.treino_id, data: dataLocal(x.iniciado_em), concluida: x.status !== "em_andamento" && (x.series_concluidas ?? 0) > 0 }));
    return usoDosProntos(treinos, sessoes, hoje, dataLocal);
  }
  const db = await getDb();
  const { data: ts, error } = await db
    .from("treinos")
    .select("id, aluno_id, observacoes, ativo, created_at")
    .eq("autoria", "proprio")
    .not("observacoes", "is", null)
    .limit(10000);
  if (error) throw error;
  const treinos = ((ts ?? []) as TreinoMarcado[]).filter((t) => ehMarcado(t.observacoes));
  const sessoes: SessaoDoTreino[] = [];
  const ids = treinos.map((t) => t.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error: e2 } = await db.from("training_sessions").select("aluno_id, treino_id, iniciado_em, status, series_concluidas").in("treino_id", ids.slice(i, i + 200)).limit(10000);
    if (e2) throw e2;
    for (const x of (data ?? []) as Array<{ aluno_id: string; treino_id: string | null; iniciado_em: string; status: string; series_concluidas: number | null }>)
      sessoes.push({ aluno_id: x.aluno_id, treino_id: x.treino_id, data: dataLocal(x.iniciado_em), concluida: x.status !== "em_andamento" && (x.series_concluidas ?? 0) > 0 });
  }
  return usoDosProntos(treinos, sessoes, hoje, dataLocal);
}
