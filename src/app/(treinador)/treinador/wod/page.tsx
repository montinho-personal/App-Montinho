import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { rankingWodDia, wodsRecentes } from "@/lib/data/wod-dia";
import { dataLocal } from "@/lib/aderencia/calcular";
import { WodPersonalClient } from "./WodPersonalClient";

export const metadata = { title: "WOD do dia" };

export default async function WodPersonalPage() {
  if (!FEATURES.multimodalidade) notFound();
  await requireTreinadorPage();
  const [wods, itens] = await Promise.all([wodsRecentes().catch(() => []), listarBiblioteca().catch(() => [])]);
  const hoje = dataLocal(new Date());
  const doDia = wods.find((w) => w.data === hoje && w.publicado) ?? null;
  const ranking = doDia ? await rankingWodDia(doDia.id, { alunoId: null, treinador: true }).catch(() => []) : [];
  return <WodPersonalClient hoje={hoje} wods={wods} itens={itens} rankingHoje={ranking} />;
}
