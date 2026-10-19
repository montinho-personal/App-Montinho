// Acervo desidentificado de programas (memória de prescrições).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import type { BibliotecaPrograma, SnapshotPrograma } from "@/lib/supabase/types-sessoes";
import { desidentificar, extrairMetadados, hashEstrutura, resumoLegivel } from "@/lib/memoria/similaridade";

export async function listMemoria(): Promise<BibliotecaPrograma[]> {
  if (isDemoMode()) return demoStore().memoria.filter((m) => !m.excluido_em).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  const db = await getDb();
  const { data } = await db.from("biblioteca_programas").select("*").is("excluido_em", null).order("updated_at", { ascending: false }).limit(500);
  return (data ?? []) as BibliotecaPrograma[];
}

export async function getMemoria(id: string): Promise<BibliotecaPrograma | null> {
  if (isDemoMode()) return demoStore().memoria.find((m) => m.id === id && !m.excluido_em) ?? null;
  const db = await getDb();
  const { data } = await db.from("biblioteca_programas").select("*").eq("id", id).is("excluido_em", null).maybeSingle();
  return (data as BibliotecaPrograma | null) ?? null;
}

/** Guarda (ou atualiza, se a estrutura já existir) uma versão no acervo desidentificado. */
export async function registrarNaMemoria(snapshot: SnapshotPrograma, versaoId: string | null, autorId: string, volume?: unknown): Promise<BibliotecaPrograma | null> {
  const limpo = desidentificar(snapshot);
  const metadados = extrairMetadados(limpo);
  if (metadados.total_series === 0) return null; // nada a aprender de um programa vazio
  const hash = hashEstrutura(limpo);
  const resumo = resumoLegivel(metadados);
  const nome = snapshot.programa.nome?.trim() && snapshot.programa.nome !== "Programa atual" ? snapshot.programa.nome : resumo;
  const tags = [metadados.split, `${metadados.dias} dias`, metadados.objetivo, metadados.nivel, ...metadados.prioridades].filter((x): x is string => Boolean(x)).map((x) => x.toLowerCase());
  const agora = new Date().toISOString();

  if (isDemoMode()) {
    const s = demoStore();
    const existente = s.memoria.find((m) => m.hash_estrutura === hash && !m.excluido_em);
    if (existente) {
      existente.uso_count += 1;
      existente.status = existente.favorito ? "favorito" : "utilizado";
      existente.updated_at = agora;
      existente.origem_versao_id = versaoId;
      return existente;
    }
    const novo: BibliotecaPrograma = {
      id: uid(),
      origem_versao_id: versaoId,
      hash_estrutura: hash,
      nome,
      resumo,
      metadados,
      estrutura: limpo,
      volume: volume ?? null,
      tags,
      status: "criado",
      favorito: false,
      uso_count: 1,
      feedback: { util: 0, nao_util: 0, usei_adaptei: 0 },
      justificativa: null,
      autor_id: autorId,
      excluido_em: null,
      created_at: agora,
      updated_at: agora,
    };
    s.memoria.unshift(novo);
    return novo;
  }

  const db = await getDb();
  const { data: existente } = await db.from("biblioteca_programas").select("id, uso_count, favorito").eq("hash_estrutura", hash).is("excluido_em", null).maybeSingle();
  if (existente) {
    const { data } = await db
      .from("biblioteca_programas")
      .update({ uso_count: (existente.uso_count ?? 0) + 1, status: existente.favorito ? "favorito" : "utilizado", origem_versao_id: versaoId })
      .eq("id", existente.id)
      .select("*")
      .single();
    return (data as BibliotecaPrograma | null) ?? null;
  }
  const { data, error } = await db
    .from("biblioteca_programas")
    .insert({ origem_versao_id: versaoId, hash_estrutura: hash, nome, resumo, metadados, estrutura: limpo, volume: volume ?? {}, tags, status: "criado", uso_count: 1, autor_id: autorId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as BibliotecaPrograma;
}

export type FeedbackMemoria = "util" | "nao_util" | "usei_adaptei";

export async function feedbackMemoria(id: string, tipo: FeedbackMemoria, desfazer = false): Promise<BibliotecaPrograma | null> {
  const delta = desfazer ? -1 : 1;
  if (isDemoMode()) {
    const m = demoStore().memoria.find((x) => x.id === id);
    if (!m) return null;
    m.feedback = { ...m.feedback, [tipo]: Math.max(0, (m.feedback[tipo] ?? 0) + delta) };
    if (tipo === "usei_adaptei" && !desfazer) m.status = m.favorito ? "favorito" : "utilizado";
    m.updated_at = new Date().toISOString();
    return m;
  }
  const db = await getDb();
  const atual = await getMemoria(id);
  if (!atual) return null;
  const feedback = { ...atual.feedback, [tipo]: Math.max(0, (atual.feedback[tipo] ?? 0) + delta) };
  const { data } = await db.from("biblioteca_programas").update({ feedback, status: tipo === "usei_adaptei" && !desfazer && !atual.favorito ? "utilizado" : atual.status }).eq("id", id).select("*").single();
  return (data as BibliotecaPrograma | null) ?? null;
}

export async function atualizarMemoria(id: string, patch: { favorito?: boolean; justificativa?: string | null; nome?: string; tags?: string[]; status?: BibliotecaPrograma["status"] }): Promise<BibliotecaPrograma | null> {
  if (isDemoMode()) {
    const m = demoStore().memoria.find((x) => x.id === id);
    if (!m) return null;
    Object.assign(m, patch, { updated_at: new Date().toISOString() });
    if (patch.favorito === true) m.status = "favorito";
    if (patch.favorito === false && m.status === "favorito") m.status = "utilizado";
    return m;
  }
  const db = await getDb();
  const extra = patch.favorito === true ? { status: "favorito" } : patch.favorito === false ? { status: "utilizado" } : {};
  const { data } = await db.from("biblioteca_programas").update({ ...patch, ...extra }).eq("id", id).select("*").single();
  return (data as BibliotecaPrograma | null) ?? null;
}

/** Exclui do ACERVO (soft delete). O histórico do aluno (programa_versoes) permanece intacto. */
export async function excluirDaMemoria(id: string): Promise<boolean> {
  if (isDemoMode()) {
    const m = demoStore().memoria.find((x) => x.id === id);
    if (!m) return false;
    m.excluido_em = new Date().toISOString();
    return true;
  }
  const db = await getDb();
  const { error, count } = await db.from("biblioteca_programas").update({ excluido_em: new Date().toISOString() }, { count: "exact" }).eq("id", id);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
