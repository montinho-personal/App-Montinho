export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { appMode } from "@/lib/env";
import { getSessao } from "@/lib/auth/session";
import { LoginClient } from "./LoginClient";
import { DemoLoginClient } from "./DemoLoginClient";
import { DEMO_PERSONAS } from "@/lib/mock/personas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string; conta?: string; email?: string }> }) {
  const mode = appMode();
  if (mode === "nao_configurado") redirect("/configuracao-pendente");
  const s = await getSessao();
  const { next, erro, conta, email } = await searchParams;
  if (s) redirect(s.role === "treinador" ? "/treinador" : "/aluno");
  if (mode === "demo") return <DemoLoginClient personas={DEMO_PERSONAS.map((p) => ({ chave: p.chave, nome: p.nome, role: p.role }))} />;
  // Entrou (pelo link ou senha) mas o e-mail não tem ficha de aluno: explica em vez de só voltar ao login.
  let semCadastro = false;
  if (!s) {
    const { data } = await (await createSupabaseServerClient()).auth.getUser().catch(() => ({ data: { user: null } }));
    semCadastro = !!data.user;
  }
  const erroInicial = semCadastro ? "sem_cadastro" : conta === "existente" ? "conta_existente" : erro === "link" || erro === "navegador" ? erro : null;
  return <LoginClient next={next && next.startsWith("/") ? next : "/"} erroInicial={erroInicial} emailInicial={email && email.length <= 160 ? email : ""} />;
}
