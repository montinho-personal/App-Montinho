export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { appMode } from "@/lib/env";
import { getSessao } from "@/lib/auth/session";
import { DefinirSenhaClient } from "./DefinirSenhaClient";

export const metadata = { title: "Definir senha" };

export default async function DefinirSenhaPage() {
  if (appMode() !== "live") redirect("/login");
  const s = await getSessao();
  if (!s) redirect("/login?next=/conta/senha");
  return <DefinirSenhaClient destino={s.role === "treinador" ? "/treinador/ajustes" : "/aluno/perfil"} />;
}
