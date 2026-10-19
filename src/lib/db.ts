// ============================================================================
// Camada de acesso a dados (leituras gerais).
//
//  • Live: cliente AUTENTICADO com RLS (src/lib/supabase/rls.ts). A chave
//    service_role NÃO é usada aqui.
//  • Demo: dados fictícios do src/lib/mock (identificado na UI).
//
// Plano prescrito, sessões, memória e acompanhamento vivem em src/lib/data/*.
// ============================================================================

import { mockAlunos, mockDieta, mockPagamentos, mockProfiles } from "@/lib/mock/db";
import { mockAnamnese, mockBiblioteca, mockConhecimento, mockFotos, mockMensagens, mockSolicitacoes, mockTemplates } from "@/lib/mock/db-extended";
import { demoStore } from "@/lib/mock/store";
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import type { Aluno, Profile, Treino } from "@/lib/supabase/types";
import type { ExercicioPrescrito } from "@/lib/supabase/types-sessoes";

export { isDemoMode } from "@/lib/env";

export type AlunoComPerfil = Aluno & { profile?: Profile | null };

// ============================================================================
// Alunos
// ============================================================================
export async function listAlunos(): Promise<AlunoComPerfil[]> {
  if (isDemoMode()) {
    return demoStore().alunos.map((a) => ({ ...a, profile: mockProfiles.find((p) => p.id === a.profile_id) ?? null }));
  }
  const db = await getDb();
  const { data } = await db.from("alunos").select("*, profile:profiles(*)").order("created_at", { ascending: false });
  return (data ?? []) as AlunoComPerfil[];
}

export async function getAluno(id: string): Promise<AlunoComPerfil | null> {
  if (isDemoMode()) {
    const aluno = demoStore().alunos.find((a) => a.id === id);
    if (!aluno) return null;
    return { ...aluno, profile: mockProfiles.find((p) => p.id === aluno.profile_id) ?? null };
  }
  const db = await getDb();
  const { data } = await db.from("alunos").select("*, profile:profiles(*)").eq("id", id).maybeSingle();
  return (data as AlunoComPerfil | null) ?? null;
}

// ============================================================================
// Treinos (plano ativo) — leitura simples; escrita em src/lib/data/programas.ts
// ============================================================================
export async function listTreinos(alunoId: string): Promise<Treino[]> {
  if (isDemoMode()) {
    return demoStore()
      .treinos.filter((t) => t.aluno_id === alunoId && t.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  }
  const db = await getDb();
  const { data } = await db.from("treinos").select("*").eq("aluno_id", alunoId).eq("ativo", true).order("ordem");
  return (data ?? []) as Treino[];
}

export async function listExerciciosByTreino(treinoId: string): Promise<ExercicioPrescrito[]> {
  if (isDemoMode()) {
    return demoStore()
      .exercicios.filter((e) => e.treino_id === treinoId && !e.removido_em)
      .sort((a, b) => a.ordem - b.ordem);
  }
  const db = await getDb();
  const { data } = await db.from("exercicios").select("*").eq("treino_id", treinoId).is("removido_em", null).order("ordem");
  return (data ?? []) as ExercicioPrescrito[];
}

// ============================================================================
// Dieta
// ============================================================================
export async function listDieta(alunoId: string) {
  if (isDemoMode()) return mockDieta.filter((d) => d.aluno_id === alunoId).sort((a, b) => a.ordem - b.ordem);
  const db = await getDb();
  const { data } = await db.from("dieta").select("*").eq("aluno_id", alunoId).order("ordem");
  return data ?? [];
}

// ============================================================================
// Evolução (medidas)
// ============================================================================
export async function listEvolucao(alunoId: string) {
  if (isDemoMode()) return demoStore().evolucao.filter((e) => e.aluno_id === alunoId).sort((a, b) => (a.data < b.data ? -1 : 1));
  const db = await getDb();
  const { data } = await db.from("evolucao").select("*").eq("aluno_id", alunoId).order("data");
  return data ?? [];
}

// ============================================================================
// Pagamentos
// ============================================================================
export async function listPagamentos(alunoId?: string) {
  if (isDemoMode()) {
    const all = [...mockPagamentos].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return alunoId ? all.filter((p) => p.aluno_id === alunoId) : all;
  }
  const db = await getDb();
  let q = db.from("pagamentos").select("*").order("created_at", { ascending: false });
  if (alunoId) q = q.eq("aluno_id", alunoId);
  const { data } = await q;
  return data ?? [];
}

// ============================================================================
// Biblioteca de exercícios
// ============================================================================
export async function listBiblioteca(grupo?: string) {
  if (isDemoMode()) {
    const ativos = mockBiblioteca.filter((e) => !e.arquivado);
    return grupo ? ativos.filter((e) => e.grupo_muscular === grupo) : ativos;
  }
  const db = await getDb();
  let q = db.from("exercicios_biblioteca").select("*").eq("arquivado", false).order("nome");
  if (grupo) q = q.eq("grupo_muscular", grupo);
  const { data } = await q;
  return data ?? [];
}

export async function getBibliotecaItem(id: string) {
  if (isDemoMode()) return mockBiblioteca.find((e) => e.id === id) ?? null;
  const db = await getDb();
  const { data } = await db.from("exercicios_biblioteca").select("*").eq("id", id).maybeSingle();
  return data;
}

// ============================================================================
// Templates de treino (legado — a memória de prescrições substitui aos poucos)
// ============================================================================
export async function listTemplates() {
  if (isDemoMode()) return mockTemplates;
  const db = await getDb();
  const { data } = await db.from("templates_treino").select("*").order("uso_count", { ascending: false });
  return data ?? [];
}

// ============================================================================
// Check-ins
// ============================================================================
export async function listCheckIns(alunoId: string, dias = 30) {
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  const desde = limite.toISOString().slice(0, 10);
  if (isDemoMode()) {
    return demoStore()
      .checkIns.filter((c) => c.aluno_id === alunoId && c.data >= desde)
      .sort((a, b) => (a.data < b.data ? -1 : 1));
  }
  const db = await getDb();
  const { data } = await db.from("check_ins").select("*").eq("aluno_id", alunoId).gte("data", desde).order("data");
  return data ?? [];
}

export async function getCheckInHoje(alunoId: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  if (isDemoMode()) return demoStore().checkIns.find((c) => c.aluno_id === alunoId && c.data === hoje) ?? null;
  const db = await getDb();
  const { data } = await db.from("check_ins").select("*").eq("aluno_id", alunoId).eq("data", hoje).maybeSingle();
  return data;
}

// ============================================================================
// Anamnese
// ============================================================================
export async function getAnamnese(alunoId: string) {
  if (isDemoMode()) return mockAnamnese.find((a) => a.aluno_id === alunoId) ?? null;
  const db = await getDb();
  const { data } = await db.from("anamnese").select("*").eq("aluno_id", alunoId).maybeSingle();
  return data;
}

// ============================================================================
// Fotos de evolução (metadados; o arquivo fica no bucket privado)
// ============================================================================
export async function listFotos(alunoId: string) {
  if (isDemoMode()) return mockFotos.filter((f) => f.aluno_id === alunoId).sort((a, b) => (a.data < b.data ? -1 : 1));
  const db = await getDb();
  const { data } = await db.from("fotos").select("*").eq("aluno_id", alunoId).order("data");
  return data ?? [];
}

// ============================================================================
// Solicitações recorrentes
// ============================================================================
export async function listSolicitacoes(alunoId: string) {
  if (isDemoMode()) return mockSolicitacoes.filter((s) => s.aluno_id === alunoId).sort((a, b) => (a.proxima_em < b.proxima_em ? -1 : 1));
  const db = await getDb();
  const { data } = await db.from("solicitacoes").select("*").eq("aluno_id", alunoId).order("proxima_em");
  return data ?? [];
}

// ============================================================================
// Mensagens (leitura)
// ============================================================================
export async function listMensagens(alunoId: string) {
  if (isDemoMode()) return mockMensagens.filter((m) => m.aluno_id === alunoId).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const db = await getDb();
  const { data } = await db.from("mensagens").select("*, remetente:profiles(nome, avatar_url)").eq("aluno_id", alunoId).order("created_at");
  return data ?? [];
}

// ============================================================================
// Base de conhecimento
// ============================================================================
export async function listConhecimento(tipo?: string) {
  if (isDemoMode()) {
    const ativos = mockConhecimento.filter((c) => !c.arquivado);
    return tipo ? ativos.filter((c) => c.tipo === tipo) : ativos;
  }
  const db = await getDb();
  let q = db.from("conhecimento").select("*").eq("arquivado", false).order("destaque", { ascending: false }).order("created_at", { ascending: false });
  if (tipo) q = q.eq("tipo", tipo);
  const { data } = await q;
  return data ?? [];
}

export async function getConhecimento(id: string) {
  if (isDemoMode()) return mockConhecimento.find((c) => c.id === id) ?? null;
  const db = await getDb();
  const { data } = await db.from("conhecimento").select("*").eq("id", id).maybeSingle();
  return data;
}

// ============================================================================
// Métricas simples do painel (contagens de alunos)
// ============================================================================
export async function getDashboardMetrics() {
  const alunos = isDemoMode() ? demoStore().alunos : ((await (await getDb()).from("alunos").select("status, acesso_ate")).data ?? []);
  const hoje = new Date().toISOString().slice(0, 10);
  const proximosVencer = alunos.filter((a) => {
    if (!a.acesso_ate) return false;
    const dias = (new Date(a.acesso_ate).getTime() - new Date(hoje).getTime()) / 86_400_000;
    return dias >= 0 && dias <= 7;
  }).length;
  return {
    total_alunos: alunos.length,
    ativos: alunos.filter((a) => a.status === "ativo").length,
    inadimplentes: alunos.filter((a) => a.status === "inadimplente").length,
    pendentes: alunos.filter((a) => a.status === "pendente").length,
    pausados: alunos.filter((a) => a.status === "pausado").length,
    proximos_vencer: proximosVencer,
  };
}

export { mockAlunos };
