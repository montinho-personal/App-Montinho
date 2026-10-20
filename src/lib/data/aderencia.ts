// ============================================================================
// Aderência — carrega dados persistidos (sessões, metas, pausas, versões do
// plano) e entrega ao cálculo puro (src/lib/aderencia/calcular.ts).
// Sempre pelo cliente com RLS: aluno lê só o seu; treinador lê todos.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import type { Calendario } from "@/lib/volume/calcular";
import type { ProgramaVersao, TrainingSession } from "@/lib/supabase/types-sessoes";
import { calcularAderencia, dataLocal, somarDias, type CalendarioVigente, type EntradaAderencia, type MetaVigente, type PausaAluno, type ResultadoAderencia, type SessaoAderencia } from "@/lib/aderencia/calcular";

export type MetaSemanal = { id: string; aluno_id: string; meta: number; vigente_desde: string; observacao: string | null; created_at: string };
export type Pausa = { id: string; aluno_id: string; inicio: string; fim: string | null; tipo: string; motivo: string | null; created_at: string };

/** Janela máxima carregada (o período completo é limitado a ~2 anos). */
const DIAS_MAX = 730;

type DemoAderencia = { metas: MetaSemanal[]; pausas: Pausa[] };
function demo(): DemoAderencia {
  const g = globalThis as unknown as { __montinhoAderencia?: DemoAderencia };
  g.__montinhoAderencia ??= { metas: [], pausas: [] };
  return g.__montinhoAderencia;
}

type Bruto = {
  sessoes: SessaoAderencia[];
  metas: MetaSemanal[];
  pausas: Pausa[];
  versoes: Array<Pick<ProgramaVersao, "aluno_id" | "created_at" | "snapshot">>;
  programas: Array<{ aluno_id: string; created_at: string; frequencia: Record<string, number> | null; calendario: unknown }>;
};

const somaFrequencia = (f: Record<string, number> | null | undefined) => Math.round(Object.values(f ?? {}).reduce((a, b) => a + (Number(b) || 0), 0));

async function carregarBruto(alunoIds: string[] | null): Promise<Bruto> {
  const desde = new Date(Date.now() - DIAS_MAX * 86_400_000).toISOString();
  if (isDemoMode()) {
    const st = demoStore();
    const filtro = <T extends { aluno_id: string }>(xs: T[]) => (alunoIds ? xs.filter((x) => alunoIds.includes(x.aluno_id)) : xs);
    return {
      sessoes: filtro(st.sessions).filter((s) => s.iniciado_em >= desde) as SessaoAderencia[] & TrainingSession[],
      metas: filtro(demo().metas),
      pausas: filtro(demo().pausas),
      versoes: filtro(st.versoes),
      programas: filtro(st.programas ?? []).map((p) => ({ aluno_id: p.aluno_id, created_at: p.created_at, frequencia: p.frequencia as Record<string, number>, calendario: p.calendario })),
    };
  }
  const db = await getDb();
  let qs = db.from("training_sessions").select("id, aluno_id, iniciado_em, status, modo, origem, series_planejadas, series_concluidas, treino_id, letra, nome_treino, duracao_seg, conta_aderencia").gte("iniciado_em", desde).order("iniciado_em").limit(5000);
  let qm = db.from("metas_semanais").select("*").order("vigente_desde");
  let qp = db.from("pausas_aluno").select("*").order("inicio");
  let qv = db.from("programa_versoes").select("aluno_id, created_at, snapshot").order("created_at").limit(2000);
  let qpr = db.from("programas").select("aluno_id, created_at, frequencia, calendario").eq("ativo", true);
  if (alunoIds) {
    qs = qs.in("aluno_id", alunoIds);
    qm = qm.in("aluno_id", alunoIds);
    qp = qp.in("aluno_id", alunoIds);
    qv = qv.in("aluno_id", alunoIds);
    qpr = qpr.in("aluno_id", alunoIds);
  }
  const [s, m, p, v, pr] = await Promise.all([qs, qm, qp, qv, qpr]);
  return {
    sessoes: (s.data ?? []) as unknown as SessaoAderencia[],
    metas: (m.data ?? []) as MetaSemanal[],
    pausas: (p.data ?? []) as Pausa[],
    versoes: (v.data ?? []) as Bruto["versoes"],
    programas: (pr.data ?? []) as Bruto["programas"],
  };
}

function entradaDoAluno(alunoId: string, inicioAcompanhamento: string, b: Bruto, hoje: string): EntradaAderencia {
  const versoes = b.versoes.filter((v) => v.aluno_id === alunoId);
  const metasPrograma: MetaVigente[] = versoes
    .map((v) => ({ desde: dataLocal(v.created_at), meta: somaFrequencia((v.snapshot as { programa?: { frequencia?: Record<string, number> } })?.programa?.frequencia), origem: "programa" as const }))
    .filter((m) => m.meta > 0);
  const calendarios: CalendarioVigente[] = versoes.map((v) => ({ desde: dataLocal(v.created_at), calendario: ((v.snapshot as { programa?: { calendario?: Calendario } })?.programa?.calendario ?? null) as Calendario | null }));
  const prog = b.programas.find((p) => p.aluno_id === alunoId);
  if (prog && !metasPrograma.length && somaFrequencia(prog.frequencia) > 0) metasPrograma.push({ desde: dataLocal(prog.created_at), meta: somaFrequencia(prog.frequencia), origem: "programa" });
  if (prog && !calendarios.length) calendarios.push({ desde: dataLocal(prog.created_at), calendario: (prog.calendario ?? null) as Calendario | null });
  const metasPersonal: MetaVigente[] = b.metas.filter((m) => m.aluno_id === alunoId).map((m) => ({ desde: m.vigente_desde, meta: m.meta, origem: "personal" }));
  // Histórico importado com conta_aderencia=false não entra na aderência.
  const sessoes = b.sessoes.filter((s) => (s as SessaoAderencia & { aluno_id?: string; conta_aderencia?: boolean }).aluno_id === alunoId && (s as { conta_aderencia?: boolean }).conta_aderencia !== false);
  const primeira = sessoes.map((s) => dataLocal(s.iniciado_em)).sort()[0];
  const limite = somarDias(hoje, -DIAS_MAX);
  const inicio = [inicioAcompanhamento, primeira].filter(Boolean).sort()[0] ?? hoje;
  return {
    sessoes,
    metas: [...metasPersonal, ...metasPrograma],
    pausas: b.pausas.filter((p) => p.aluno_id === alunoId).map((p): PausaAluno => ({ inicio: p.inicio, fim: p.fim, tipo: p.tipo, motivo: p.motivo })),
    calendarios,
    inicio: inicio < limite ? limite : inicio,
    hoje,
  };
}

export type AderenciaAluno = ResultadoAderencia & { metaAtual: { meta: number | null; origem: "personal" | "programa" | null }; metas: MetaSemanal[]; pausas: Pausa[]; sessoesPorId: Record<string, SessaoAderencia> };

export async function aderenciaDoAluno(aluno: { id: string; data_inicio: string | null; created_at: string }): Promise<AderenciaAluno> {
  const b = await carregarBruto([aluno.id]);
  const hoje = dataLocal(new Date());
  const entrada = entradaDoAluno(aluno.id, aluno.data_inicio ?? dataLocal(aluno.created_at), b, hoje);
  const r = calcularAderencia(entrada);
  const pers = b.metas.filter((m) => m.aluno_id === aluno.id).sort((a, c) => (a.vigente_desde < c.vigente_desde ? -1 : 1)).filter((m) => m.vigente_desde <= hoje).at(-1);
  return {
    ...r,
    metaAtual: pers ? { meta: pers.meta, origem: "personal" } : { meta: r.semanaAtual?.meta ?? null, origem: r.semanaAtual?.meta ? "programa" : null },
    metas: b.metas.filter((m) => m.aluno_id === aluno.id),
    pausas: b.pausas.filter((p) => p.aluno_id === aluno.id),
    sessoesPorId: Object.fromEntries(entrada.sessoes.map((s) => [s.id, s])),
  };
}

/** Todos os alunos (central do personal). */
export type AderenciaCentral = ResultadoAderencia & { ultimaSessao: string | null; datas: string[]; sessaoAbertaDesde: string | null; planoAlteradoEm: string | null; pausaTipo: string | null };

export async function aderenciaDeTodos(alunos: Array<{ id: string; data_inicio: string | null; created_at: string }>): Promise<Record<string, AderenciaCentral>> {
  const b = await carregarBruto(null);
  const hoje = dataLocal(new Date());
  const out: Record<string, AderenciaCentral> = {};
  for (const a of alunos) {
    const entrada = entradaDoAluno(a.id, a.data_inicio ?? dataLocal(a.created_at), b, hoje);
    const ultima = entrada.sessoes.filter((s) => s.status !== "em_andamento" && (s.series_concluidas ?? 0) > 0).map((s) => s.iniciado_em).sort().at(-1) ?? null;
    const datas = entrada.sessoes.filter((s) => s.status !== "em_andamento" && (s.series_concluidas ?? 0) > 0 && s.modo !== "extra").map((s) => dataLocal(s.iniciado_em));
    const aberta = entrada.sessoes.filter((s) => s.status === "em_andamento").map((s) => s.iniciado_em).sort().at(-1) ?? null;
    const versao = b.versoes.filter((v) => v.aluno_id === a.id).map((v) => v.created_at).sort().at(-1) ?? null;
    const pausa = b.pausas.find((p) => p.aluno_id === a.id && p.inicio <= hoje && (!p.fim || p.fim >= hoje)) ?? null;
    out[a.id] = { ...calcularAderencia(entrada), ultimaSessao: ultima, datas, sessaoAbertaDesde: aberta, planoAlteradoEm: versao ? dataLocal(versao) : null, pausaTipo: pausa?.tipo ?? null };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Escrita (treinador; RLS garante no banco)
// ---------------------------------------------------------------------------
export async function definirMetaSemanal(alunoId: string, meta: number, vigenteDesde: string, observacao: string | null): Promise<void> {
  if (isDemoMode()) {
    demo().metas.push({ id: uid(), aluno_id: alunoId, meta, vigente_desde: vigenteDesde, observacao, created_at: new Date().toISOString() });
    return;
  }
  const db = await getDb();
  const { error } = await db.from("metas_semanais").insert({ aluno_id: alunoId, meta, vigente_desde: vigenteDesde, observacao });
  if (error) throw new Error(error.message);
}

export async function registrarPausa(alunoId: string, p: { inicio: string; fim: string | null; tipo: string; motivo: string | null }): Promise<void> {
  if (isDemoMode()) {
    demo().pausas.push({ id: uid(), aluno_id: alunoId, ...p, created_at: new Date().toISOString() });
    return;
  }
  const db = await getDb();
  const { error } = await db.from("pausas_aluno").insert({ aluno_id: alunoId, ...p });
  if (error) throw new Error(error.message);
}

export async function encerrarPausa(alunoId: string, pausaId: string, fim: string): Promise<void> {
  if (isDemoMode()) {
    const p = demo().pausas.find((x) => x.id === pausaId && x.aluno_id === alunoId);
    if (p) p.fim = fim;
    return;
  }
  const db = await getDb();
  const { error } = await db.from("pausas_aluno").update({ fim }).eq("id", pausaId).eq("aluno_id", alunoId);
  if (error) throw new Error(error.message);
}
