// Ranking de troféus (0076). Sempre pela função do banco: o aluno não lê as
// conquistas dos outros; a função devolve só nome abreviado, posição e total.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { desempateDaAderencia, type LinhaRanking } from "@/lib/ranking/trofeus";
import type { ResultadoAderencia } from "@/lib/aderencia/calcular";
import { sincronizarConquistas } from "@/lib/data/conquistas";

// Demonstração: pessoas fictícias (Aline e Diego empatam em troféus: o desempate decide).
const DEMO: Array<{ id: string; nome: string; trofeus: number; semana: number | null; seguidas: number; pct4: number | null; visitante?: boolean }> = [
  { id: "x-carla", nome: "Carla M.", trofeus: 17, semana: 100, seguidas: 6, pct4: 94 },
  { id: "aline", nome: "Aline S.", trofeus: 14, semana: 75, seguidas: 2, pct4: 80 },
  { id: "x-diego", nome: "Diego P.", trofeus: 14, semana: 100, seguidas: 3, pct4: 88 },
  { id: "joao", nome: "João P.", trofeus: 9, semana: 67, seguidas: 0, pct4: 58 },
  { id: "x-fernanda", nome: "Fernanda L.", trofeus: 6, semana: 100, seguidas: 1, pct4: 70 },
  { id: "bia", nome: "Bia R.", trofeus: 4, semana: 100, seguidas: 2, pct4: 90, visitante: true },
  { id: "x-gabriel", nome: "Gabriel T.", trofeus: 2, semana: 50, seguidas: 0, pct4: 40, visitante: true },
];

export async function getRanking(meuAlunoId: string | null): Promise<LinhaRanking[]> {
  if (isDemoMode()) {
    const chave = (d: (typeof DEMO)[number]) => [d.trofeus, d.semana ?? -1, d.seguidas, d.pct4 ?? -1];
    const cmp = (a: (typeof DEMO)[number], b: (typeof DEMO)[number]) => {
      const [x, y] = [chave(a), chave(b)];
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i];
      return 0;
    };
    const ordenados = [...DEMO].sort((a, b) => cmp(a, b) || a.nome.localeCompare(b.nome));
    return ordenados.map((d, i) => {
      const posicao = ordenados.findIndex((o) => cmp(o, d) === 0) + 1;
      const eu = d.id === meuAlunoId;
      return { posicao, nome: d.nome, trofeus: d.trofeus, eu, visitante: !!d.visitante, aderenciaSemana: eu || meuAlunoId === null ? d.semana : null, mesmoTotalAcima: i > 0 && ordenados[i - 1].trofeus === d.trofeus };
    });
  }
  const db = await getDb();
  const { data, error } = await db.rpc("ranking_trofeus_v2");
  if (error) throw new Error(error.message);
  type Linha = { posicao: number; nome: string; trofeus: number; eu: boolean; visitante: boolean; aderencia_semana?: number | null; mesmo_total_acima?: boolean };
  return ((data ?? []) as Linha[]).map((r) => ({ posicao: Number(r.posicao), nome: r.nome, trofeus: Number(r.trofeus), eu: !!r.eu, visitante: !!r.visitante, aderenciaSemana: r.aderencia_semana ?? null, mesmoTotalAcima: !!r.mesmo_total_acima }));
}

/**
 * Grava os números de desempate (0079). Só o personal grava (RLS): a conta é a
 * mesma da Evolução, feita no app, e nenhum aluno consegue alterar a própria.
 */
export async function salvarDesempate(aderencias: Record<string, Pick<ResultadoAderencia, "semanas" | "sequencia" | "indices">>): Promise<void> {
  if (isDemoMode()) return;
  const linhas = Object.entries(aderencias).map(([alunoId, r]) => {
    const d = desempateDaAderencia(r);
    return { aluno_id: alunoId, pct_semana: d.pctSemana, semana_inicio: d.semanaInicio, semanas_seguidas: d.semanasSeguidas, pct_4sem: d.pct4Semanas, atualizado_em: new Date().toISOString() };
  });
  if (!linhas.length) return;
  const db = await getDb();
  const { error } = await db.from("ranking_desempate").upsert(linhas, { onConflict: "aluno_id" });
  if (error) throw new Error(error.message);
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
