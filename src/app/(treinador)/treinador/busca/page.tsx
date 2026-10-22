export const dynamic = "force-dynamic";

import { requireTreinadorPage } from "@/lib/auth/session";
import { indiceBusca } from "@/lib/data/busca";
import { BuscaClient } from "./BuscaClient";

export const metadata = { title: "Buscar" };

export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireTreinadorPage();
  const [{ q }, alunos] = await Promise.all([searchParams, indiceBusca()]);
  return <BuscaClient alunos={alunos} inicial={(q ?? "").slice(0, 80)} />;
}
