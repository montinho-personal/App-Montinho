export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { appMode } from "@/lib/env";
import { getSessao } from "@/lib/auth/session";

export default async function RootPage() {
  const mode = appMode();
  if (mode === "nao_configurado") redirect("/configuracao-pendente");
  const s = await getSessao();
  if (!s) redirect("/login");
  redirect(s.role === "treinador" ? "/treinador" : "/aluno");
}
