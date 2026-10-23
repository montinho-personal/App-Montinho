// Ranking de troféus (0076). Sempre pela função do banco: o aluno não lê as
// conquistas dos outros; a função devolve só nome abreviado, posição e total.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import type { LinhaRanking } from "@/lib/ranking/trofeus";
import { sincronizarConquistas } from "@/lib/data/conquistas";

// Demonstração: pessoas fictícias.
const DEMO: Array<{ id: string; nome: string; trofeus: number; visitante?: boolean }> = [
  { id: "x-carla", nome: "Carla M.", trofeus: 17 },
  { id: "aline", nome: "Aline S.", trofeus: 14 },
  { id: "x-diego", nome: "Diego P.", trofeus: 14 },
  { id: "joao", nome: "João P.", trofeus: 9 },
  { id: "x-fernanda", nome: "Fernanda L.", trofeus: 6 },
  { id: "bia", nome: "Bia R.", trofeus: 4, visitante: true },
  { id: "x-gabriel", nome: "Gabriel T.", trofeus: 2, visitante: true },
];

export async function getRanking(meuAlunoId: string | null): Promise<LinhaRanking[]> {
  if (isDemoMode()) {
    const ordenados = [...DEMO].sort((a, b) => b.trofeus - a.trofeus || a.nome.localeCompare(b.nome));
    const valores = [...new Set(ordenados.map((d) => d.trofeus))];
    return ordenados.map((d) => ({ posicao: valores.indexOf(d.trofeus) + 1, nome: d.nome, trofeus: d.trofeus, eu: d.id === meuAlunoId, visitante: !!d.visitante }));
  }
  const db = await getDb();
  const { data, error } = await db.rpc("ranking_trofeus");
  if (error) throw new Error(error.message);
  return ((data ?? []) as LinhaRanking[]).map((r) => ({ posicao: Number(r.posicao), nome: r.nome, trofeus: Number(r.trofeus), eu: !!r.eu, visitante: !!r.visitante }));
}

export async function getRankingVisivel(alunoId: string): Promise<boolean> {
  if (isDemoMode()) return true;
  const db = await getDb();
  const { data } = await db.from("alunos").select("ranking_visivel").eq("id", alunoId).maybeSingle();
  return (data as { ranking_visivel?: boolean } | null)?.ranking_visivel !== false;
}

export async function definirRankingVisivel(visivel: boolean): Promise<void> {
  if (isDemoMode()) return;
  const db = await getDb();
  const { error } = await db.rpc("definir_ranking_visivel", { p_visivel: visivel });
  if (error) throw new Error(error.message);
}

/**
 * Atualiza os troféus antes de mostrar o ranking: as conquistas só são gravadas
 * quando a pessoa abre certas telas, então o número podia ficar atrasado.
 * O personal atualiza todos os ativos; o aluno, só os dele.
 */
export async function atualizarTrofeus(alunos: Array<{ id: string; data_inicio: string | null; created_at: string; status?: string | null }>): Promise<void> {
  const ativos = alunos.filter((a) => !a.status || a.status === "ativo");
  for (let i = 0; i < ativos.length; i += 4) {
    await Promise.all(ativos.slice(i, i + 4).map((a) => sincronizarConquistas(a).catch(() => null)));
  }
}
