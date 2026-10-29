// Pedido de avaliação no Google (0112): destino do lembrete no celular.
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES, isDemoMode } from "@/lib/env";
import { BRAND } from "@/config/brand";
import { eventosCta } from "@/lib/data/ctas";
import { campanhaDoVisitante } from "@/lib/data/campanhas";
import { avaliacaoEncerrada, linkAvaliacao, TEXTOS_AVALIACAO } from "@/lib/visitante/avaliacao";
import { PedirAvaliacao } from "@/components/visitante/PedirAvaliacao";

export const metadata = { title: "Avaliar no Google" };
export const dynamic = "force-dynamic";

export default async function AvaliarPage() {
  const sessao = await requireAlunoPage();
  const link = linkAvaliacao(isDemoMode());
  if (!FEATURES.modoVisitante || !link || (!ehVisitante(sessao) && !isDemoMode())) redirect("/aluno");
  const [eventos, campanha] = await Promise.all([eventosCta(sessao.alunoId, 60).catch(() => []), campanhaDoVisitante(sessao.alunoId, sessao.acessoFim ?? null).catch(() => null)]);
  const feita = avaliacaoEncerrada(eventos);
  return (
    <div className="space-y-5">
      <Link href="/aluno" className="alvo inline-block text-sm text-fg-muted hover:text-fg">← Início</Link>
      {feita ? (
        <p className="rounded-2xl border border-accent/50 bg-accent/10 p-4 text-center text-sm font-semibold">{TEXTOS_AVALIACAO.obrigado}</p>
      ) : (
        <PedirAvaliacao link={link} treinos={campanha?.treinosConcluidos ?? 0} whatsapp={BRAND.contact.whatsapp || null} tela="avaliar" />
      )}
    </div>
  );
}
