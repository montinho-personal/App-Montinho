// Topo do Ranking (0138): o banco anota o 1º lugar de cada dia e concede os
// troféus. Aqui: pedir a conferência (ao abrir o Ranking) e ler a sequência
// de quem está no topo hoje (o personal vê todos; o aluno, só os dias dele).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { sequenciaNoTopo, type DiaTopo } from "@/lib/conquistas/topo-ranking";
import { demoGuardarConquista } from "@/lib/data/conquistas";

/** Confere quem é o 1º agora e concede os troféus (sem a 0138 no banco, não faz nada). */
export async function registrarTopoRanking(): Promise<void> {
  if (isDemoMode()) {
    // Demo: a Aline chegou ao topo há 2 dias (para o Celebrar do personal e a comemoração dela).
    const desde = somarDias(dataLocal(new Date()), -2);
    demoGuardarConquista({ aluno_id: "aline", codigo: "topo_ranking", referencia: desde, conquistado_em: `${desde}T14:00:00.000Z`, session_id: null, titulo: "Topo do Ranking", descricao: `1º lugar no ranking de troféus em ${desde.slice(8, 10)}/${desde.slice(5, 7)}.`, dados: {}, evidencia: { desde }, origem: "app", vista_em: null });
    return;
  }
  const db = await getDb();
  await db.rpc("registrar_topo_ranking").then(() => undefined, () => undefined);
}

export type TopoHoje = { alunoId: string; dias: number; desde: string };

/** Quem está no topo hoje e há quantos dias seguidos (null = ninguém, ou o aluno não é o líder). */
export async function topoHoje(): Promise<TopoHoje | null> {
  const hoje = dataLocal(new Date());
  if (isDemoMode()) return { alunoId: "x-carla", dias: 3, desde: somarDias(hoje, -2) };
  const db = await getDb();
  const { data, error } = await db.from("ranking_topo").select("dia, aluno_id").gte("dia", somarDias(hoje, -45)).order("dia", { ascending: false });
  if (error || !data?.length) return null;
  const dias: DiaTopo[] = (data as Array<{ dia: string; aluno_id: string }>).map((r) => ({ dia: r.dia, alunoId: r.aluno_id }));
  const lider = dias.find((d) => d.dia === hoje)?.alunoId;
  if (!lider) return null;
  const s = sequenciaNoTopo(dias, lider, hoje);
  return s.dias && s.desde ? { alunoId: lider, dias: s.dias, desde: s.desde } : null;
}
