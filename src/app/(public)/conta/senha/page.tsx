export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { appMode } from "@/lib/env";
import { getSessao } from "@/lib/auth/session";
import { DefinirSenhaClient } from "./DefinirSenhaClient";

export const metadata = { title: "Definir senha" };

export default async function DefinirSenhaPage({ searchParams }: { searchParams: Promise<{ primeiro?: string }> }) {
  if (appMode() !== "live") redirect("/login");
  const s = await getSessao();
  if (!s) redirect("/login?next=/conta/senha");
  const primeiro = (await searchParams).primeiro === "1";
  return <DefinirSenhaClient primeiro={primeiro} destino={s.role === "treinador" ? "/treinador/ajustes" : primeiro ? "/aluno" : "/aluno/perfil"} />;
}
