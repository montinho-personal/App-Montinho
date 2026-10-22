export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/env";
import { requireAlunoPage } from "@/lib/auth/session";
import { perfilVisitante } from "@/lib/data/visitantes";
import { BoasVindasClient } from "./BoasVindasClient";

export const metadata = { title: "Boas-vindas" };

export default async function BoasVindasPage() {
  if (!FEATURES.modoVisitante) notFound();
  const sessao = await requireAlunoPage();
  const perfil = await perfilVisitante(sessao.alunoId).catch(() => null);
  const primeiroNome = sessao.nome.trim().split(/\s+/)[0] ?? "";
  return <BoasVindasClient primeiroNome={primeiroNome} inicial={perfil} />;
}
