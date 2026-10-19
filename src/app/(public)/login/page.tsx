export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { appMode } from "@/lib/env";
import { getSessao } from "@/lib/auth/session";
import { LoginClient } from "./LoginClient";
import { DemoLoginClient } from "./DemoLoginClient";
import { DEMO_PERSONAS } from "@/lib/mock/personas";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const mode = appMode();
  if (mode === "nao_configurado") redirect("/configuracao-pendente");
  const s = await getSessao();
  const { next } = await searchParams;
  if (s) redirect(s.role === "treinador" ? "/treinador" : "/aluno");
  if (mode === "demo") return <DemoLoginClient personas={DEMO_PERSONAS.map((p) => ({ chave: p.chave, nome: p.nome, role: p.role }))} />;
  return <LoginClient next={next && next.startsWith("/") ? next : "/"} />;
}
