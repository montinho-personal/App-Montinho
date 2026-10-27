// ============================================================================
// Identidade no servidor: quem está logado, qual papel e qual aluno_id.
//
//  • Live: auth.getUser() do Supabase + profile (RLS) + alunos.profile_id.
//  • Demo: cookie explícito escolhido na tela de entrada (persona de demo).
// Páginas e APIs NUNCA recebem o aluno por constante ou parâmetro de URL sem
// passar por aqui (Prompt Mestre §3.1).
// ============================================================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { appMode, DEMO_COOKIE } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_PERSONAS } from "@/lib/mock/personas";
import { podeAcessarAluno, sessaoDoCookieDemo, type SessaoApp } from "./guards";
import { CABECALHO_ALUNO } from "./cabecalho";
import { COMO_ALUNO_COOKIE } from "./como-aluno";
import { demoStore } from "@/lib/mock/store";

export type { SessaoApp } from "./guards";

export async function getSessao(): Promise<SessaoApp | null> {
  const mode = appMode();
  if (mode === "nao_configurado") return null;

  if (mode === "demo") {
    const jar = await cookies();
    const s = sessaoDoCookieDemo(jar.get(DEMO_COOKIE)?.value, DEMO_PERSONAS);
    if (s?.role === "treinador" && jar.get(COMO_ALUNO_COOKIE)?.value === "1") {
      const meu = demoStore().alunos.find((a) => a.profile_id === s.userId);
      if (meu) return { mode: "demo", userId: s.userId, nome: s.nome, role: "aluno", alunoId: meu.id, modalidade: "consultoria", comoPersonal: true };
    }
    return s;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nome, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  if (profile.role === "treinador") {
    // “Meu treino”: o personal no app do aluno, com a própria ficha.
    if ((await cookies()).get(COMO_ALUNO_COOKIE)?.value === "1") {
      const { data: meu } = await supabase.from("alunos").select("id").eq("profile_id", user.id).maybeSingle();
      if (meu) return { mode: "live", userId: user.id, nome: profile.nome, role: "aluno", alunoId: meu.id, modalidade: "consultoria", comoPersonal: true };
    }
    return { mode: "live", userId: user.id, nome: profile.nome, role: "treinador", alunoId: null };
  }
  const { data: aluno } = await supabase.from("alunos").select("id, modalidade").eq("profile_id", user.id).maybeSingle();
  if (!aluno) return null; // perfil sem cadastro de aluno: não libera dados
  const modalidade = aluno.modalidade === "visitante" ? "visitante" : "consultoria";
  let acessoFim: string | null = null;
  if (modalidade === "visitante") {
    const { data: acesso } = await supabase.from("acessos_visitante").select("fim").eq("aluno_id", aluno.id).maybeSingle();
    acessoFim = acesso?.fim ?? null;
  }
  return { mode: "live", userId: user.id, nome: profile.nome, role: "aluno", alunoId: aluno.id, modalidade, acessoFim };
}

// ---------------------------------------------------------------------------
// Guards para PÁGINAS (redirecionam)
// ---------------------------------------------------------------------------
export async function requireAlunoPage(): Promise<Extract<SessaoApp, { role: "aluno" }>> {
  if (appMode() === "nao_configurado") redirect("/login");
  const s = await getSessao();
  if (!s) redirect("/login?next=/aluno");
  // Cookie do “Meu treino” sem ficha de aluno: limpa e volta ao painel (sem laço de redirecionamento).
  if (s.role !== "aluno") redirect("/api/meu-treino?sair=1");
  return s;
}

export async function requireTreinadorPage(): Promise<Extract<SessaoApp, { role: "treinador" }>> {
  if (appMode() === "nao_configurado") redirect("/login");
  const s = await getSessao();
  if (!s) redirect("/login?next=/treinador");
  if (s.role !== "treinador") redirect("/aluno");
  return s;
}

// ---------------------------------------------------------------------------
// Guards para ROUTE HANDLERS (respondem 401/403)
// ---------------------------------------------------------------------------
type GuardResult<T> = { sessao: T; error: null } | { sessao: null; error: NextResponse };

export async function requireAlunoApi(): Promise<GuardResult<Extract<SessaoApp, { role: "aluno" }>>> {
  const s = await getSessao();
  if (!s) return { sessao: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (s.role !== "aluno") return { sessao: null, error: NextResponse.json({ error: "Apenas alunos" }, { status: 403 }) };
  return { sessao: s, error: null };
}

export async function requireTreinadorApi(): Promise<GuardResult<Extract<SessaoApp, { role: "treinador" }>>> {
  const s = await getSessao();
  if (!s) return { sessao: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (s.role !== "treinador") return { sessao: null, error: NextResponse.json({ error: "Apenas o treinador pode fazer isso" }, { status: 403 }) };
  return { sessao: s, error: null };
}

/** Qualquer usuário autenticado que possa ver o aluno indicado (dono ou treinador). */
export async function requireAcessoAlunoApi(alunoId: string): Promise<GuardResult<SessaoApp>> {
  const s = await getSessao();
  if (!s) return { sessao: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (!podeAcessarAluno(s, alunoId)) return { sessao: null, error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  return { sessao: s, error: null };
}

/**
 * APIs do treino: o próprio aluno OU o personal em aula presencial. Para o
 * personal, o aluno vem do cabeçalho CABECALHO_ALUNO e passa por
 * podeAcessarAluno (a RLS do banco também só libera treinador).
 */
export async function requireAlunoDoTreinoApi(request: Request): Promise<GuardResult<{ alunoId: string; presencial: boolean; userId: string }>> {
  const s = await getSessao();
  if (!s) return { sessao: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (s.role === "aluno") return { sessao: { alunoId: s.alunoId, presencial: false, userId: s.userId }, error: null };
  const alunoId = request.headers.get(CABECALHO_ALUNO)?.trim() ?? "";
  if (!alunoId || alunoId.length > 64 || !/^[\w-]+$/.test(alunoId)) return { sessao: null, error: NextResponse.json({ error: "Escolha o aluno da aula" }, { status: 400 }) };
  if (!podeAcessarAluno(s, alunoId)) return { sessao: null, error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  return { sessao: { alunoId, presencial: true, userId: s.userId }, error: null };
}
