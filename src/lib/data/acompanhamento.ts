// Adaptações pedidas pelo aluno, intervenções do treinador e correções de grupo.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid, mockProfiles } from "@/lib/mock/store";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { Adaptacao, GrupoCorrecao, Intervencao } from "@/lib/supabase/types-sessoes";
import { normalizarNome } from "@/lib/grupos";

// ---------------------------------------------------------------------------
// Adaptações
// ---------------------------------------------------------------------------
export async function criarAdaptacao(alunoId: string, input: Omit<Adaptacao, "id" | "aluno_id" | "status" | "resposta" | "respondido_por" | "respondido_em" | "created_at">): Promise<Adaptacao> {
  const agora = new Date().toISOString();
  if (isDemoMode()) {
    const a: Adaptacao = { id: uid(), aluno_id: alunoId, status: "aberta", resposta: null, respondido_por: null, respondido_em: null, created_at: agora, ...input };
    demoStore().adaptacoes.unshift(a);
    return a;
  }
  const db = await getDb();
  const { data, error } = await db.from("adaptacoes").insert({ aluno_id: alunoId, ...input }).select("*").single();
  if (error) throw new Error(error.message);
  return data as Adaptacao;
}

export async function listAdaptacoes(alunoId?: string, somenteAbertas = false): Promise<Array<Adaptacao & { aluno_nome?: string }>> {
  if (isDemoMode()) {
    const st = demoStore();
    return st.adaptacoes
      .filter((a) => (!alunoId || a.aluno_id === alunoId) && (!somenteAbertas || a.status === "aberta"))
      .map((a) => ({ ...a, aluno_nome: mockProfiles.find((p) => p.id === st.alunos.find((x) => x.id === a.aluno_id)?.profile_id)?.nome }));
  }
  const db = await getDb();
  let q = db.from("adaptacoes").select("*, aluno:alunos(profile:profiles(nome))").order("created_at", { ascending: false }).limit(100);
  if (alunoId) q = q.eq("aluno_id", alunoId);
  if (somenteAbertas) q = q.eq("status", "aberta");
  const { data } = await q;
  return ((data ?? []) as Array<Adaptacao & { aluno?: { profile?: { nome?: string } } }>).map((a) => ({ ...a, aluno_nome: a.aluno?.profile?.nome }));
}

export async function responderAdaptacao(id: string, autorId: string, resposta: string, status: "respondida" | "resolvida" = "respondida"): Promise<Adaptacao | null> {
  const agora = new Date().toISOString();
  if (isDemoMode()) {
    const a = demoStore().adaptacoes.find((x) => x.id === id);
    if (!a) return null;
    Object.assign(a, { resposta, status, respondido_por: autorId, respondido_em: agora });
    await criarIntervencao(a.aluno_id, autorId, { tipo: "resposta_adaptacao", titulo: `Resposta: ${a.exercicio_nome ?? "adaptação"}`, descricao: resposta, referencia: { adaptacao_id: id }, visivel_aluno: true });
    return a;
  }
  const db = await getDb();
  const { data, error } = await db.from("adaptacoes").update({ resposta, status, respondido_por: autorId, respondido_em: agora }).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  const a = data as Adaptacao;
  await criarIntervencao(a.aluno_id, autorId, { tipo: "resposta_adaptacao", titulo: `Resposta: ${a.exercicio_nome ?? "adaptação"}`, descricao: resposta, referencia: { adaptacao_id: id }, visivel_aluno: true });
  return a;
}

// ---------------------------------------------------------------------------
// Intervenções do treinador (registro com autoria e data)
// ---------------------------------------------------------------------------
export async function criarIntervencao(alunoId: string, autorId: string, input: { tipo: Intervencao["tipo"]; titulo?: string | null; descricao: string; referencia?: Record<string, unknown>; visivel_aluno?: boolean }): Promise<Intervencao> {
  const agora = new Date().toISOString();
  if (isDemoMode()) {
    const i: Intervencao = { id: uid(), aluno_id: alunoId, autor_id: autorId, tipo: input.tipo, titulo: input.titulo ?? null, descricao: input.descricao, referencia: input.referencia ?? {}, visivel_aluno: input.visivel_aluno ?? false, created_at: agora, autor: { nome: mockProfiles.find((p) => p.id === autorId)?.nome ?? "Montinho" } };
    demoStore().intervencoes.unshift(i);
    return i;
  }
  const db = await getDb();
  const { data, error } = await db.from("intervencoes").insert({ aluno_id: alunoId, autor_id: autorId, tipo: input.tipo, titulo: input.titulo ?? null, descricao: input.descricao, referencia: input.referencia ?? {}, visivel_aluno: input.visivel_aluno ?? false }).select("*").single();
  if (error) throw new Error(error.message);
  return data as Intervencao;
}

export async function listIntervencoes(alunoId: string, limite = 30): Promise<Intervencao[]> {
  if (isDemoMode()) return demoStore().intervencoes.filter((i) => i.aluno_id === alunoId).slice(0, limite);
  const db = await getDb();
  const { data } = await db.from("intervencoes").select("*, autor:profiles(nome)").eq("aluno_id", alunoId).order("created_at", { ascending: false }).limit(limite);
  return (data ?? []) as Intervencao[];
}

// ---------------------------------------------------------------------------
// Correções de classificação (conhecimento reutilizável)
// ---------------------------------------------------------------------------
export async function listCorrecoes(): Promise<Map<string, { grupo: GrupoMuscular; secundarios: GrupoMuscular[] }>> {
  let rows: GrupoCorrecao[] = [];
  if (isDemoMode()) rows = demoStore().correcoes;
  else {
    const db = await getDb();
    const { data } = await db.from("grupo_correcoes").select("nome_normalizado, grupo_muscular, grupos_secundarios");
    rows = (data ?? []) as GrupoCorrecao[];
  }
  return new Map(rows.map((r) => [r.nome_normalizado, { grupo: r.grupo_muscular, secundarios: r.grupos_secundarios ?? [] }]));
}

export async function salvarCorrecoes(autorId: string, itens: Array<{ nome: string; grupo: GrupoMuscular; secundarios?: GrupoMuscular[] }>): Promise<number> {
  const validos = itens.map((i) => ({ nome_normalizado: normalizarNome(i.nome), grupo_muscular: i.grupo, grupos_secundarios: i.secundarios ?? [] })).filter((i) => i.nome_normalizado);
  if (!validos.length) return 0;
  if (isDemoMode()) {
    const st = demoStore();
    for (const v of validos) {
      const ex = st.correcoes.find((c) => c.nome_normalizado === v.nome_normalizado);
      if (ex) Object.assign(ex, v);
      else st.correcoes.push(v);
    }
    return validos.length;
  }
  const db = await getDb();
  const { error } = await db.from("grupo_correcoes").upsert(validos.map((v) => ({ ...v, autor_id: autorId })), { onConflict: "nome_normalizado" });
  if (error) throw new Error(error.message);
  return validos.length;
}

// ---------------------------------------------------------------------------
// Check-in diário do aluno (uma linha por dia)
// ---------------------------------------------------------------------------
export async function salvarCheckIn(alunoId: string, valores: { energia?: number | null; sono?: number | null; dor?: number | null; motivacao?: number | null; estresse?: number | null; notas?: string | null }) {
  const hoje = new Date().toISOString().slice(0, 10);
  if (isDemoMode()) {
    const st = demoStore();
    let c = st.checkIns.find((x) => x.aluno_id === alunoId && x.data === hoje);
    if (!c) {
      c = { id: uid(), aluno_id: alunoId, data: hoje, energia: null, sono: null, dor: null, motivacao: null, estresse: null, notas: null, created_at: new Date().toISOString() };
      st.checkIns.push(c);
    }
    Object.assign(c, valores);
    return c;
  }
  const db = await getDb();
  const { data, error } = await db.from("check_ins").upsert({ aluno_id: alunoId, data: hoje, ...valores }, { onConflict: "aluno_id,data" }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}
