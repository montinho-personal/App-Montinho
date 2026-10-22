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
