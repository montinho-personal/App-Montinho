import { notFound } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { minhaSessaoDoWod, rankingWodDia, wodDoDia } from "@/lib/data/wod-dia";
import { WodDoDiaClient } from "./WodDoDiaClient";

export const metadata = { title: "WOD do dia" };

export default async function WodDoDiaPage() {
  if (!FEATURES.multimodalidade) notFound();
  const sessao = await requireAlunoPage();
  const wod = await wodDoDia().catch(() => null);
  const minha = wod ? await minhaSessaoDoWod(sessao.alunoId, wod.id).catch(() => null) : null;
  const ranking = wod ? await rankingWodDia(wod.id, { alunoId: sessao.alunoId, treinador: false }).catch(() => []) : [];
  return <WodDoDiaClient wod={wod} sessaoInicial={minha ? { id: minha.id, status: minha.status } : null} rankingInicial={ranking} />;
}
