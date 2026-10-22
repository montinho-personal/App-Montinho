// ============================================================================
// Modo Visitante — dados (convites, acessos, perfil do onboarding).
//
// Leituras e escritas pelo cliente com RLS (treinador gerencia convites; o
// visitante lê o próprio acesso e grava o próprio perfil). A service role só
// entra no cadastro por convite (src/app/api/public/convite/cadastro), que
// precisa criar o usuário de login.
// ============================================================================

import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import type { AcessoVisitante, Convite, PerfilVisitante, Profile } from "@/lib/supabase/types";
import type { AlunoComPerfil } from "@/lib/db";
import type { MotivoConviteInvalido, TipoAcesso } from "@/lib/visitante/acesso";

export type ConvitePublico = {
  codigo: string;
  tipo_acesso: TipoAcesso;
  dias: number | null;
  acesso_ate: string | null;
  campanha: string | null;
  situacao: "ok" | MotivoConviteInvalido;
};

export type VisitanteComDados = AlunoComPerfil & { acesso: AcessoVisitante | null; perfil: PerfilVisitante | null; convite_codigo: string | null };

const CONVITE_DEMO: ConvitePublico = { codigo: "DEMO-30", tipo_acesso: "dias", dias: 30, acesso_ate: null, campanha: "Desafio de demonstração", situacao: "ok" };

/** O que a página pública /convite/CODIGO pode mostrar (sem login). */
export async function convitePublico(codigo: string): Promise<ConvitePublico | null> {
  if (isDemoMode()) return codigo === CONVITE_DEMO.codigo ? CONVITE_DEMO : null;
  const db = await getDb();
  const { data } = await db.rpc("convite_publico", { p_codigo: codigo });
  const linha = Array.isArray(data) ? data[0] : null;
  return (linha as ConvitePublico | undefined) ?? null;
}

export async function listarConvites(): Promise<Convite[]> {
  if (isDemoMode()) return [{ id: "demo-convite", codigo: CONVITE_DEMO.codigo, campanha_id: null, tipo_acesso: "dias", dias: 30, acesso_ate: null, max_usos: 50, usos: 3, valido_ate: null, renovavel: true, permite_conversao: true, origem: "instagram", ativo: true, created_at: new Date().toISOString() }];
  const db = await getDb();
  const { data } = await db.from("convites").select("*").order("created_at", { ascending: false }).limit(200);
  return (data ?? []) as Convite[];
}

export async function listarVisitantes(): Promise<VisitanteComDados[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/mock/store");
    const { mockProfiles } = await import("@/lib/mock/db");
    return demoStore()
      .alunos.filter((a) => a.modalidade === "visitante")
      .map((a) => ({ ...a, profile: mockProfiles.find((p) => p.id === a.profile_id) ?? null, acesso: null, perfil: null, convite_codigo: "DEMO-30" }));
  }
  const db = await getDb();
  const { data } = await db
    .from("alunos")
    .select("*, profile:profiles(*), acesso:acessos_visitante(*, convite:convites(codigo)), perfil:perfil_visitante(*)")
    .eq("modalidade", "visitante")
    .order("created_at", { ascending: false })
    .limit(500);
  type Linha = AlunoComPerfil & { profile: Profile | null; acesso: (AcessoVisitante & { convite: { codigo: string } | null }) | null; perfil: PerfilVisitante | null };
  return ((data ?? []) as Linha[]).map((v) => ({ ...v, convite_codigo: v.acesso?.convite?.codigo ?? null }));
}

export async function perfilVisitante(alunoId: string): Promise<PerfilVisitante | null> {
  if (isDemoMode()) return null;
  const db = await getDb();
  const { data } = await db.from("perfil_visitante").select("*").eq("aluno_id", alunoId).maybeSingle();
  return (data as PerfilVisitante | null) ?? null;
}

export type DesafioVisitante = { id: string; nome: string; descricao: string | null; regras: string | null; inicio: string | null; fim: string | null; metaTreinos: number };

/** Demonstração: a Bia está no “Desafio 7 Dias Chalalá” (começou ontem). */
function desafioDemo(): DesafioVisitante {
  const hoje = new Date(Date.now() - 3 * 3_600_000);
  const dia = (d: number) => new Date(hoje.getTime() + d * 86_400_000).toISOString().slice(0, 10);
  return { id: "demo-desafio", nome: "Desafio 7 Dias Chalalá", descricao: "Três treinos em sete dias para começar com o pé direito.", regras: null, inicio: dia(-1), fim: dia(5), metaTreinos: 3 };
}

/** Desafio (campanha com meta de treinos) em que o visitante entrou pelo convite. */
export async function desafiosDoAluno(alunoId: string): Promise<DesafioVisitante[]> {
  if (isDemoMode()) return alunoId === "bia" ? [desafioDemo()] : [];
  const db = await getDb();
  const { data } = await db.from("acessos_visitante").select("campanha:campanhas(id, nome, descricao, regras, inicio, fim, meta_treinos)").eq("aluno_id", alunoId).maybeSingle();
  const c = (data as { campanha: { id: string; nome: string; descricao: string | null; regras: string | null; inicio: string | null; fim: string | null; meta_treinos: number | null } | null } | null)?.campanha;
  if (!c?.meta_treinos) return [];
  return [{ id: c.id, nome: c.nome, descricao: c.descricao, regras: c.regras, inicio: c.inicio, fim: c.fim, metaTreinos: c.meta_treinos }];
}

export type DesafioPainel = { id: string; nome: string; descricao: string | null; inicio: string | null; fim: string | null; meta_treinos: number | null; ativa: boolean; participantes: number; concluidos: number };

/** Painel do treinador: desafios com participantes e quantos concluíram (RLS: só treinador). */
export async function listarDesafios(): Promise<DesafioPainel[]> {
  if (isDemoMode()) {
    const d = desafioDemo();
    return [{ id: d.id, nome: d.nome, descricao: d.descricao, inicio: d.inicio, fim: d.fim, meta_treinos: d.metaTreinos, ativa: true, participantes: 1, concluidos: 0 }];
  }
  const db = await getDb();
  const [{ data: campanhas }, { data: acessos }, { data: medalhas }] = await Promise.all([
    db.from("campanhas").select("id, nome, descricao, inicio, fim, meta_treinos, ativa").order("created_at", { ascending: false }).limit(100),
    db.from("acessos_visitante").select("campanha_id").not("campanha_id", "is", null),
    db.from("conquistas_aluno").select("referencia").eq("codigo", "desafio_concluido"),
  ]);
  const conta = (xs: Array<Record<string, unknown>> | null, k: string, v: string) => (xs ?? []).filter((x) => x[k] === v).length;
  return ((campanhas ?? []) as Array<Omit<DesafioPainel, "participantes" | "concluidos">>).map((c) => ({ ...c, participantes: conta(acessos, "campanha_id", c.id), concluidos: conta(medalhas, "referencia", c.id) }));
}
