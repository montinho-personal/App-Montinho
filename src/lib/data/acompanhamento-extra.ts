// Dados a mais para a Central de aderência (26/10/2026): treinos seguidos sem
// carga anotada e a última avaliação de cada aluno. Leitura do personal pela RLS.
import { isDemoMode } from "@/lib/env";
import { demoStore } from "@/lib/mock/store";
import { getDb } from "@/lib/supabase/rls";
import { dataLocal } from "@/lib/aderencia/calcular";

export type ExtraAcompanhamento = { treinosSemCarga: number; ultimaAvaliacao: string | null };

type Sessao = { id: string; aluno_id: string; iniciado_em: string };
type Serie = { session_id: string; carga_kg: number | null; tipo: string };

/** Quantos dos últimos treinos concluídos (seguidos, do mais novo para trás) não têm nenhuma carga. Puro. */
export function contarSemCarga(sessoesDoAluno: Sessao[], series: Serie[], maximo = 10): number {
  const comCarga = new Set(series.filter((x) => x.tipo !== "aquecimento" && (x.carga_kg ?? 0) > 0).map((x) => x.session_id));
  const comSerie = new Set(series.map((x) => x.session_id));
  let n = 0;
  for (const s of [...sessoesDoAluno].sort((a, b) => (a.iniciado_em < b.iniciado_em ? 1 : -1)).slice(0, maximo)) {
    if (!comSerie.has(s.id)) continue;
    if (comCarga.has(s.id)) break;
    n++;
  }
  return n;
}

const POR_ALUNO = 6;

export async function extrasAcompanhamento(alunoIds: string[]): Promise<Record<string, ExtraAcompanhamento>> {
  const out: Record<string, ExtraAcompanhamento> = Object.fromEntries(alunoIds.map((id) => [id, { treinosSemCarga: 0, ultimaAvaliacao: null }]));
  if (!alunoIds.length) return out;
  let sessoes: Sessao[] = [];
  let series: Serie[] = [];
  let avaliacoes: Array<{ aluno_id: string; data: string }> = [];
  if (isDemoMode()) {
    const st = demoStore();
    sessoes = st.sessions.filter((s) => alunoIds.includes(s.aluno_id) && s.status === "concluida");
    const ids = new Set(sessoes.map((s) => s.id));
    series = st.sessionSets.filter((x) => ids.has(x.session_id));
    avaliacoes = st.evolucao.filter((e) => alunoIds.includes(e.aluno_id)).map((e) => ({ aluno_id: e.aluno_id, data: e.data }));
  } else {
    const db = await getDb();
    const desde = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const [{ data: s }, { data: ev }, { data: arq }] = await Promise.all([
      db.from("training_sessions").select("id, aluno_id, iniciado_em").eq("status", "concluida").gt("series_concluidas", 0).gte("iniciado_em", desde).in("aluno_id", alunoIds).order("iniciado_em", { ascending: false }).limit(2000),
      db.from("evolucao").select("aluno_id, data").in("aluno_id", alunoIds).order("data", { ascending: false }).limit(2000),
      db.from("avaliacoes_arquivos").select("aluno_id, data_avaliacao").in("aluno_id", alunoIds).order("data_avaliacao", { ascending: false }).limit(2000),
    ]);
    // Só os últimos treinos de cada aluno importam.
    const porAluno = new Map<string, number>();
    sessoes = ((s ?? []) as Sessao[]).filter((x) => {
      const n = porAluno.get(x.aluno_id) ?? 0;
      porAluno.set(x.aluno_id, n + 1);
      return n < POR_ALUNO;
    });
    const ids = sessoes.map((x) => x.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { data: sets } = await db.from("session_sets").select("session_id, carga_kg, tipo").in("session_id", ids.slice(i, i + 100)).limit(5000);
      series.push(...((sets ?? []) as Serie[]));
    }
    avaliacoes = [...((ev ?? []) as Array<{ aluno_id: string; data: string }>), ...((arq ?? []) as Array<{ aluno_id: string; data_avaliacao: string }>).map((a) => ({ aluno_id: a.aluno_id, data: a.data_avaliacao }))];
  }
  for (const id of alunoIds) {
    out[id].treinosSemCarga = contarSemCarga(sessoes.filter((x) => x.aluno_id === id), series);
    out[id].ultimaAvaliacao = avaliacoes.filter((a) => a.aluno_id === id).map((a) => dataLocal(a.data.length > 10 ? a.data : `${a.data}T12:00:00`)).sort().at(-1) ?? null;
  }
  return out;
}
