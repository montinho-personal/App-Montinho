// ============================================================================
// Resultado dos blocos do WOD/HYROX/circuito (Multimodalidade, fase 3; 0133).
// 1 linha por (sessão, bloco) em `sessao_blocos` — gravar de novo corrige.
// Só na sessão EM ANDAMENTO do próprio aluno (RLS + conferência aqui).
// Os blocos que pedem resultado (WOD, circuito, corrida, estação) contam como
// “séries feitas” da sessão, para o treino valer pela MESMA regra de sempre
// (concluído = metade ou mais do previsto).
// ============================================================================
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { corridaDaSessao, pedeResultado, type ResultadoBloco } from "@/lib/modalidades/resultado";
import type { BlocoTreino } from "@/lib/modalidades/tipos";

export type LinhaBloco = ResultadoBloco & { id: string; session_id: string; aluno_id: string; ordem: number; created_at: string; updated_at: string };

type DemoBlocos = { linhas: LinhaBloco[] };
function demo(): DemoBlocos {
  const g = globalThis as unknown as { __montinhoBlocos?: DemoBlocos };
  if (!g.__montinhoBlocos) g.__montinhoBlocos = { linhas: [] };
  return g.__montinhoBlocos;
}

const COLUNAS = "id, session_id, aluno_id, bloco_id, ordem, tipo, formato, condicao, concluido, tempo_seg, time_cap_seg, rounds, reps, carga_kg, distancia_m, calorias, intervalos, segmentos, modificacoes, benchmark_id, benchmark_versao, esforco, created_at, updated_at";

/** Blocos do treino congelados no começo da sessão (snapshot). */
export function blocosDoSnapshot(snapshot: unknown): BlocoTreino[] {
  const b = (snapshot as { blocos?: BlocoTreino[] } | null)?.blocos;
  return Array.isArray(b) ? b : [];
}

/** Quantos blocos “com resultado” o treino tem (entram no previsto da sessão). */
export const blocosComResultado = (blocos: BlocoTreino[]) => blocos.filter((b) => pedeResultado(b.tipo)).length;

/** Blocos com resultado já registrados na sessão (somam às séries feitas). */
export async function blocosFeitosNaSessao(sessionId: string): Promise<number> {
  if (isDemoMode()) return demo().linhas.filter((l) => l.session_id === sessionId && pedeResultado(l.tipo)).length;
  const db = await getDb();
  const { count } = await db.from("sessao_blocos").select("id", { count: "exact", head: true }).eq("session_id", sessionId).in("tipo", ["metcon", "circuito", "corrida", "estacao"]);
  return count ?? 0;
}

export async function blocosDaSessao(alunoId: string, sessionId: string): Promise<LinhaBloco[]> {
  if (isDemoMode()) return demo().linhas.filter((l) => l.session_id === sessionId && l.aluno_id === alunoId).sort((a, b) => a.ordem - b.ordem);
  const db = await getDb();
  const { data } = await db.from("sessao_blocos").select(COLUNAS).eq("session_id", sessionId).eq("aluno_id", alunoId).order("ordem");
  return ((data ?? []) as Array<Record<string, unknown>>).map(deLinha);
}

function deLinha(r: Record<string, unknown>): LinhaBloco {
  const segs = (r.segmentos as Array<{ completo?: boolean; benchmark?: string }> | null) ?? null;
  const extra = segs?.[0] ?? {};
  return { ...(r as unknown as LinhaBloco), carga_kg: r.carga_kg != null ? Number(r.carga_kg) : null, intervalos: (r.intervalos as number[] | null) ?? null, completo: extra.completo ?? null, benchmark: extra.benchmark ?? null };
}

export type EntradaBloco = Omit<ResultadoBloco, "bloco_id"> & { bloco_id: string; ordem: number; client_key: string };

/** Grava (ou corrige) o resultado de um bloco. Devolve a linha e o novo total de “feitas” da sessão. */
export async function salvarBlocoSessao(alunoId: string, sessionId: string, e: EntradaBloco): Promise<{ bloco: LinhaBloco; feitas: number }> {
  const agora = new Date().toISOString();
  const valores = {
    bloco_id: e.bloco_id,
    ordem: e.ordem,
    tipo: e.tipo,
    formato: e.formato ?? null,
    condicao: e.condicao ?? null,
    concluido: e.concluido,
    tempo_seg: e.tempo_seg ?? null,
    time_cap_seg: e.time_cap_seg ?? null,
    rounds: e.rounds ?? null,
    reps: e.reps ?? null,
    carga_kg: e.carga_kg ?? null,
    distancia_m: e.distancia_m ?? null,
    calorias: e.calorias ?? null,
    intervalos: e.intervalos ?? null,
    modificacoes: e.modificacoes ?? null,
    esforco: e.esforco ?? null,
    benchmark_versao: e.benchmark_versao ?? null,
  };
  // O que não tem coluna própria (benchmark por slug, HYROX completo) vai em `segmentos`.
  const segmentos = e.benchmark || e.completo != null ? [{ ...(e.benchmark ? { benchmark: e.benchmark } : {}), ...(e.completo != null ? { completo: e.completo } : {}) }] : null;

  if (isDemoMode()) {
    const st = demoStore();
    const s = st.sessions.find((x) => x.id === sessionId && x.aluno_id === alunoId);
    if (!s) throw new Error("Sessão não encontrada");
    if (s.status !== "em_andamento") throw new Error("Esse treino já terminou.");
    const lista = demo().linhas;
    let linha = lista.find((l) => l.session_id === sessionId && l.bloco_id === e.bloco_id);
    if (linha) Object.assign(linha, valores, { benchmark: e.benchmark ?? null, completo: e.completo ?? null, updated_at: agora });
    else {
      linha = { id: uid(), session_id: sessionId, aluno_id: alunoId, created_at: agora, updated_at: agora, ...valores, benchmark: e.benchmark ?? null, completo: e.completo ?? null } as LinhaBloco;
      lista.push(linha);
    }
    const feitas = st.sessionSets.filter((x) => x.session_id === sessionId && x.tipo !== "aquecimento").length + (await blocosFeitosNaSessao(sessionId));
    s.series_concluidas = feitas;
    return { bloco: linha, feitas };
  }

  const db = await getDb();
  const { data: s } = await db.from("training_sessions").select("id, status").eq("id", sessionId).eq("aluno_id", alunoId).maybeSingle();
  if (!s) throw new Error("Sessão não encontrada");
  if (s.status !== "em_andamento") throw new Error("Esse treino já terminou.");
  const { data, error } = await db
    .from("sessao_blocos")
    .upsert({ session_id: sessionId, aluno_id: alunoId, client_key: e.client_key, segmentos, ...valores, updated_at: agora }, { onConflict: "session_id,bloco_id" })
    .select(COLUNAS)
    .single();
  if (error) {
    if (error.code === "42501") throw new Error("Seu acesso ao app terminou. Para voltar a treinar, fale com o Montinho.");
    throw new Error(`Não foi possível salvar o resultado: ${error.message}`);
  }
  const { count } = await db.from("session_sets").select("id", { count: "exact", head: true }).eq("session_id", sessionId).neq("tipo", "aquecimento");
  const feitas = (count ?? 0) + (await blocosFeitosNaSessao(sessionId));
  await db.from("training_sessions").update({ series_concluidas: feitas }).eq("id", sessionId);
  return { bloco: deLinha(data as Record<string, unknown>), feitas };
}

/** Resultados anteriores do MESMO bloco/benchmark (para comparar com justiça na tela). */
export async function resultadosAnteriores(alunoId: string, opts: { benchmark?: string | null; treinoBlocoChave?: string | null; antesDe: string }): Promise<LinhaBloco[]> {
  if (!opts.benchmark) return [];
  if (isDemoMode()) return demo().linhas.filter((l) => l.aluno_id === alunoId && l.benchmark === opts.benchmark && l.created_at < opts.antesDe);
  const db = await getDb();
  const { data } = await db.from("sessao_blocos").select(COLUNAS).eq("aluno_id", alunoId).lt("created_at", opts.antesDe).contains("segmentos", [{ benchmark: opts.benchmark }]).order("created_at", { ascending: false }).limit(20);
  return ((data ?? []) as Array<Record<string, unknown>>).map(deLinha);
}

/**
 * Corrida do HYROX → 1 cardio ligado à sessão (`client_key` hyrox:<sessão>):
 * gravar de novo corrige o mesmo registro, nunca cria outro. Falhar aqui não
 * atrapalha o resultado do bloco (o cardio é um bônus da contagem).
 */
export async function sincronizarCorridaHyrox(alunoId: string, sessionId: string): Promise<void> {
  const corrida = corridaDaSessao(await blocosDaSessao(alunoId, sessionId));
  if (!corrida) return;
  // Import tardio: cardio.ts já depende de sessões, que dependem deste arquivo.
  const { registrarCardio, corrigirCardio } = await import("./cardio");
  const reg = await registrarCardio(alunoId, { client_key: `hyrox:${sessionId}`, modalidade: "corrida", status: "concluido", duracao_min: corrida.minutos, distancia_km: corrida.km, session_id: sessionId, observacoes: "Corrida do HYROX" }, "app");
  if (reg.duracao_min !== corrida.minutos || (reg.distancia_km ?? null) !== corrida.km) await corrigirCardio(alunoId, reg.id, { duracao_min: corrida.minutos, distancia_km: corrida.km });
}

/** Resultados do aluno que foram benchmark (Fran, Grace…), com a data de Brasília. */
export async function resultadosDeBenchmark(alunoId: string): Promise<Array<LinhaBloco & { data: string; benchmark: string }>> {
  const { dataLocal } = await import("@/lib/aderencia/calcular");
  const linhas = isDemoMode()
    ? demo().linhas.filter((l) => l.aluno_id === alunoId && l.benchmark)
    : await (async () => {
        const db = await getDb();
        const { data } = await db.from("sessao_blocos").select(COLUNAS).eq("aluno_id", alunoId).eq("tipo", "metcon").not("segmentos", "is", null).order("created_at").limit(500);
        return ((data ?? []) as Array<Record<string, unknown>>).map(deLinha).filter((l) => l.benchmark);
      })();
  return linhas.map((l) => ({ ...l, benchmark: l.benchmark!, data: dataLocal(l.created_at) }));
}
