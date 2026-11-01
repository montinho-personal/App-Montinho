// Topo do Ranking (0138): o banco anota o 1º lugar de cada dia e concede os
// troféus de dias seguidos. Aqui: pedir a conferência (ao abrir o Ranking), a
// sequência de quem está no topo hoje e as chegadas ao 1º lugar (avisos do
// Celebrar do personal). O personal lê todos os dias; o aluno, só os dele.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { chegadasAoTopo, sequenciaNoTopo, type ChegadaTopo, type DiaTopo } from "@/lib/conquistas/topo-ranking";

/** Confere quem é o 1º agora e concede os troféus (sem a 0138 no banco, não faz nada). */
export async function registrarTopoRanking(): Promise<void> {
  if (isDemoMode()) return;
  const db = await getDb();
  await db.rpc("registrar_topo_ranking").then(() => undefined, () => undefined);
}

/** Demo: a Aline chegou ao topo há 2 dias. */
function diasDemo(hoje: string): DiaTopo[] {
  return [0, 1, 2].map((n) => ({ dia: somarDias(hoje, -n), alunoId: "aline" }));
}

async function diasDoTopo(desde: string): Promise<DiaTopo[]> {
  const hoje = dataLocal(new Date());
  if (isDemoMode()) return diasDemo(hoje).filter((d) => d.dia >= desde);
  const db = await getDb();
  const { data, error } = await db.from("ranking_topo").select("dia, aluno_id").gte("dia", desde).order("dia", { ascending: true }).limit(400);
  if (error) return [];
  return ((data ?? []) as Array<{ dia: string; aluno_id: string }>).map((r) => ({ dia: r.dia, alunoId: r.aluno_id }));
}

export type TopoHoje = { alunoId: string; dias: number; desde: string };

/** Quem está no topo hoje e há quantos dias seguidos (null = ninguém, ou o aluno não é o líder). */
export async function topoHoje(): Promise<TopoHoje | null> {
  const hoje = dataLocal(new Date());
  const dias = await diasDoTopo(somarDias(hoje, -45));
  const lider = dias.find((d) => d.dia === hoje)?.alunoId;
  if (!lider) return null;
  const s = sequenciaNoTopo(dias, lider, hoje);
  return s.dias && s.desde ? { alunoId: lider, dias: s.dias, desde: s.desde } : null;
}

/** Cada vez que alguém chegou ao 1º lugar a partir de `desde` (AAAA-MM-DD). */
export async function chegadasRecentes(desde: string): Promise<ChegadaTopo[]> {
  // Lê um pouco antes para saber se a pessoa já vinha no topo (aí não é chegada nova).
  const dias = await diasDoTopo(somarDias(desde, -1));
  return chegadasAoTopo(dias).filter((c) => c.desde >= desde);
}
