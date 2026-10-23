// “Monte com IA” (Modo Visitante): o visitante pede o treino por texto ou voz.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getPlanoAtivo } from "@/lib/data/programas";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { AvisoBaseCientifica } from "@/components/visitante/AvisoBaseCientifica";
import { MonteComIA } from "./MonteComIA";

export const metadata = { title: "Monte com IA" };

export default async function MonteComIAPage() {
  if (!FEATURES.modoVisitante) notFound();
  const sessao = await requireAlunoPage();
  if (!ehVisitante(sessao) && !isDemoMode()) notFound();
  if (!podeRegistrar("visitante", sessao.acessoFim ?? null)) redirect("/aluno/meus-treinos");
  const plano = await getPlanoAtivo(sessao.alunoId);
  const temTreinos = plano.treinos.some((t) => t.ativo && t.autoria === "proprio");
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">✨ Monte com IA</h1>
        <Link href="/aluno/meus-treinos" className="alvo text-sm text-fg-muted hover:text-fg">← Meus treinos</Link>
      </div>
      <p className="text-sm text-fg-muted">Fale ou escreva o que você quer. O app monta duas opções com base em estudos científicos e na biblioteca de exercícios do Montinho, com vídeo. Você escolhe uma e pode editar tudo depois.</p>
      <MonteComIA temTreinos={temTreinos} />
      <AvisoBaseCientifica />
    </div>
  );
}
