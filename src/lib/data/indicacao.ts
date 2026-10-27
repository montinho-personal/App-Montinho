// Indicação com desconto (0102): o desconto de quem indicou e a lista do
// personal. Regras puras em src/lib/indicacao/desconto.ts.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { resumoDesconto, type LinhaIndicacao, type ResumoDesconto } from "@/lib/indicacao/desconto";

const COLUNAS = "id, created_at, fechou_em, desconto_pct, desconto_usado_em";

/** Demo: a aluna Aline com 2 amigos que fecharam; a visitante Bia com 1 cadastrado e 1 que fechou. */
const DEMO: Record<string, LinhaIndicacao[]> = {
  aline: [
    { id: "ind-1", created_at: "2026-10-05T12:00:00Z", fechou_em: "2026-10-12T12:00:00Z", desconto_pct: 10, desconto_usado_em: null },
    { id: "ind-2", created_at: "2026-10-08T12:00:00Z", fechou_em: "2026-10-20T12:00:00Z", desconto_pct: 10, desconto_usado_em: null },
  ],
  bia: [
    { id: "ind-3", created_at: "2026-10-18T12:00:00Z", fechou_em: null, desconto_pct: 0, desconto_usado_em: null },
    { id: "ind-4", created_at: "2026-10-19T12:00:00Z", fechou_em: "2026-10-26T12:00:00Z", desconto_pct: 10, desconto_usado_em: null },
  ],
};

/** O desconto do próprio aluno/visitante (lê só as próprias indicações pela RLS). */
export async function minhaIndicacao(alunoId: string): Promise<ResumoDesconto> {
  if (isDemoMode()) return resumoDesconto(DEMO[alunoId] ?? []);
  const db = await getDb();
  const { data, error } = await db.from("indicacoes").select(COLUNAS).eq("indicador_aluno_id", alunoId).limit(500);
  // Sem a 0102 as colunas não existem: segue sem desconto.
  if (error) return resumoDesconto([]);
  return resumoDesconto((data ?? []) as LinhaIndicacao[]);
}

export type DescontoAAplicar = { indicadorId: string; nome: string; telefone: string | null; visitante: boolean; pct: number; guardado: number; amigos: string[] };

/** Painel do personal: quem tem desconto de indicação para usar. */
export async function descontosAAplicar(): Promise<DescontoAAplicar[]> {
  if (isDemoMode()) {
    return [
      { indicadorId: "aline", nome: "Aline Duarte", telefone: null, visitante: false, pct: 20, guardado: 0, amigos: ["Carla M.", "Rafa S."] },
      { indicadorId: "bia", nome: "Bia Ramos", telefone: null, visitante: true, pct: 10, guardado: 0, amigos: ["Júlia P."] },
    ];
  }
  const db = await getDb();
  const { data, error } = await db.from("indicacoes").select(`${COLUNAS}, indicador_aluno_id, indicado_aluno_id`).not("fechou_em", "is", null).is("desconto_usado_em", null).limit(2000);
  if (error || !data?.length) return [];
  const linhas = data as Array<LinhaIndicacao & { indicador_aluno_id: string; indicado_aluno_id: string }>;
  const ids = [...new Set(linhas.flatMap((l) => [l.indicador_aluno_id, l.indicado_aluno_id]))];
  const { data: alunos } = await db.from("alunos").select("id, telefone, modalidade, profile:profiles(nome)").in("id", ids);
  const info = new Map(((alunos ?? []) as unknown as Array<{ id: string; telefone: string | null; modalidade: string; profile: { nome: string | null } | null }>).map((a) => [a.id, a]));
  const porIndicador = new Map<string, typeof linhas>();
  for (const l of linhas) porIndicador.set(l.indicador_aluno_id, [...(porIndicador.get(l.indicador_aluno_id) ?? []), l]);
  return [...porIndicador.entries()]
    .map(([indicadorId, ls]) => {
      const r = resumoDesconto(ls);
      const a = info.get(indicadorId);
      return { indicadorId, nome: a?.profile?.nome ?? "Aluno", telefone: a?.telefone ?? null, visitante: a?.modalidade === "visitante", pct: r.pct, guardado: r.guardado, amigos: ls.map((l) => info.get(l.indicado_aluno_id)?.profile?.nome ?? "Amigo") };
    })
    .filter((d) => d.pct > 0)
    .sort((a, b) => b.pct - a.pct || a.nome.localeCompare(b.nome));
}

/** O personal aplicou o desconto: marca como usadas as indicações que entraram nele (até 30%). */
export async function marcarDescontoUsado(indicadorId: string): Promise<number> {
  if (isDemoMode()) return 0;
  const db = await getDb();
  const { data, error } = await db.from("indicacoes").select(COLUNAS).eq("indicador_aluno_id", indicadorId).limit(500);
  if (error) throw new Error(error.message);
  const r = resumoDesconto((data ?? []) as LinhaIndicacao[]);
  if (!r.aUsar.length) return 0;
  const { error: e2 } = await db.from("indicacoes").update({ desconto_usado_em: new Date().toISOString() }).in("id", r.aUsar);
  if (e2) throw new Error(e2.message);
  return r.pct;
}

/**
 * Quem vê o incentivo da indicação: aluno (desconto na renovação) e visitante
 * com o convite liberado (4+ treinos). Não aparece no “Meu treino” do personal
 * nem para quem já juntou 3 amigos que fecharam.
 */
export async function incentivoIndicacao(s: { alunoId: string; modalidade?: string; comoPersonal?: boolean; acessoFim?: string | null }): Promise<{ aluno: boolean; fecharam: number } | null> {
  const { FEATURES } = await import("@/lib/env");
  if (!FEATURES.modoVisitante || s.comoPersonal) return null;
  const aluno = s.modalidade !== "visitante";
  if (!aluno) {
    const { campanhaDoVisitante } = await import("@/lib/data/campanhas");
    const { REGRAS_INDICACAO } = await import("@/lib/visitante/campanhas");
    const c = await campanhaDoVisitante(s.alunoId, s.acessoFim ?? null).catch(() => null);
    if (!c || c.treinosConcluidos < REGRAS_INDICACAO.treinosMinimos) return null;
  }
  const r = await minhaIndicacao(s.alunoId).catch(() => null);
  return { aluno, fecharam: r?.fecharam ?? 0 };
}
