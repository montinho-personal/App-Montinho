// ============================================================================
// Evolução Inteligente — leitura dos dados (RLS) para o motor puro.
// Descobertas não são gravadas: recalculadas dos registros a cada leitura.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { listSessoes } from "@/lib/data/sessoes";
import { execucoesDeSessoes } from "@/lib/evolucao/adaptar";
import { descobertasDaSessao, mesmaIdentidade, type ExecucaoAnterior, type IdentidadeExercicio } from "@/lib/evolucao/motor";
import { sessaoParaAvaliar } from "@/lib/evolucao/adaptar";
import { pequenaVitoria, type Vitoria } from "@/lib/evolucao/vitoria";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { listarConquistas } from "@/lib/data/conquistas";
import { dataLocal, inicioDaSemana, somarDias, type Semana } from "@/lib/aderencia/calcular";

export type MetricaEvolucao = "recorde" | "mais_carga" | "mais_reps" | "acima_media";
export type ConfigEvolucao = { avisos_ativos: boolean; max_por_exercicio: number; max_por_sessao: number; metricas: MetricaEvolucao[]; /** “Vai que tá fácil!” na última série (0038). */ vai_que_ta_facil: boolean };
export const CONFIG_EVOLUCAO_PADRAO: ConfigEvolucao = { avisos_ativos: true, max_por_exercicio: 1, max_por_sessao: 3, metricas: ["recorde", "mais_carga", "mais_reps", "acima_media"], vai_que_ta_facil: true };

function demo(): Record<string, ConfigEvolucao> {
  const g = globalThis as unknown as { __montinhoEvolucaoConfig?: Record<string, ConfigEvolucao> };
  g.__montinhoEvolucaoConfig ??= {};
  return g.__montinhoEvolucaoConfig;
}

/** Configuração do personal para o aluno (padrão se ainda não existe ou a tabela não foi criada). */
export async function getConfigEvolucao(alunoId: string): Promise<ConfigEvolucao> {
  if (isDemoMode()) return demo()[alunoId] ?? CONFIG_EVOLUCAO_PADRAO;
  try {
    const db = await getDb();
    let { data, error } = await db.from("evolucao_config").select("avisos_ativos, max_por_exercicio, max_por_sessao, metricas, vai_que_ta_facil").eq("aluno_id", alunoId).maybeSingle();
    // Sem a coluna nova (0038 pendente): lê o resto e mantém o padrão do “Vai que tá fácil”.
    if (error) ({ data, error } = await db.from("evolucao_config").select("avisos_ativos, max_por_exercicio, max_por_sessao, metricas").eq("aluno_id", alunoId).maybeSingle());
    if (error || !data) return CONFIG_EVOLUCAO_PADRAO;
    return { ...CONFIG_EVOLUCAO_PADRAO, ...(data as Partial<ConfigEvolucao>) };
  } catch {
    return CONFIG_EVOLUCAO_PADRAO;
  }
}

export async function salvarConfigEvolucao(alunoId: string, cfg: ConfigEvolucao): Promise<void> {
  if (isDemoMode()) {
    demo()[alunoId] = cfg;
    return;
  }
  const db = await getDb();
  let { error } = await db.from("evolucao_config").upsert({ aluno_id: alunoId, ...cfg, updated_at: new Date().toISOString() }, { onConflict: "aluno_id" });
  if (error?.message.includes("vai_que_ta_facil")) {
    const { vai_que_ta_facil: _v, ...resto } = cfg;
    void _v;
    ({ error } = await db.from("evolucao_config").upsert({ aluno_id: alunoId, ...resto, updated_at: new Date().toISOString() }, { onConflict: "aluno_id" }));
  }
  if (error) throw new Error(error.message.includes("evolucao_config") ? "A tabela de configuração ainda não foi criada no banco (migração 0029)." : error.message);
}

/** Histórico comparável de cada exercício do treino (últimas 60 sessões finalizadas). */
export async function historicoParaEvolucao(alunoId: string, exercicios: Array<IdentidadeExercicio & { id: string }>): Promise<Record<string, ExecucaoAnterior[]>> {
  const execs = execucoesDeSessoes(await listSessoes(alunoId, { limite: 200, status: "todas" }));
  const out: Record<string, ExecucaoAnterior[]> = {};
  for (const ex of exercicios) {
    out[ex.id] = execs
      .filter((h) => mesmaIdentidade(ex, h) !== "insuficiente")
      .map((h) => ({ ...h, series: h.series.filter((s) => s.tipo !== "aquecimento" && (s.carga ?? 0) > 0 && (s.reps ?? 0) > 0) }))
      .filter((h) => h.series.length);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pequenas vitórias (semana atual e histórico) — recalculadas dos registros.
// ---------------------------------------------------------------------------

export async function vitoriasDoAluno(aluno: { id: string; data_inicio: string | null; created_at: string }, semanasHistorico = 8): Promise<{ atual: Vitoria | null; historico: Array<{ semana: string; vitoria: Vitoria | null }> }> {
  const hoje = dataLocal(new Date());
  const [aderencia, sessoes, conquistas] = await Promise.all([aderenciaDoAluno(aluno), listSessoes(aluno.id, { limite: 200, status: "todas" }), listarConquistas(aluno.id)]);
  const execs = execucoesDeSessoes(sessoes);
  const desde = somarDias(hoje, -(semanasHistorico * 7 + 7));
  const avaliadas = sessoes
    .filter((s) => s.status !== "em_andamento" && s.conta_aderencia !== false && dataLocal(s.iniciado_em) >= desde)
    .map((s) => ({ dia: dataLocal(s.iniciado_em), descobertas: descobertasDaSessao(sessaoParaAvaliar(s), execs.filter((h) => h.sessaoId !== s.id)) }));
  const retomadas = conquistas.filter((c) => c.codigo === "eu_voltei").map((c) => dataLocal(c.conquistado_em));
  const ate = (dia: string): Semana[] => {
    const w0 = inicioDaSemana(dia);
    return aderencia.semanas.filter((w) => w.inicio <= w0).map((w) => ({ ...w, atual: w.inicio === w0 }));
  };
  const atual = pequenaVitoria({ semanas: aderencia.semanas, sessoes: avaliadas, retomadas, hoje });
  const historico = Array.from({ length: semanasHistorico }, (_, i) => {
    const domingo = somarDias(inicioDaSemana(hoje), -1 - i * 7);
    return { semana: inicioDaSemana(domingo), vitoria: pequenaVitoria({ semanas: ate(domingo), sessoes: avaliadas.filter((x) => x.dia <= domingo), retomadas: retomadas.filter((d) => d <= domingo), hoje: domingo }) };
  });
  return { atual, historico };
}
