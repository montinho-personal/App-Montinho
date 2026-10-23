// Detalhe de um treino pronto: os treinos A, B, C…, o desafio e “Começar”.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { opcaoParaTela } from "@/lib/data/plano-visitante";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { nomeVisivel, planoDoPronto, prontoPorSlug, progressoDesafio } from "@/lib/visitante/treinos-prontos";
import { ROTULO_NIVEL } from "@/lib/visitante/gerar-treino";
import { AvisoBaseCientifica } from "@/components/visitante/AvisoBaseCientifica";
import { OpcaoPlanoCard } from "@/components/visitante/OpcaoPlanoCard";
import { ComecarPronto } from "./ComecarPronto";

export default async function TreinoProntoPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!FEATURES.modoVisitante) notFound();
  const sessao = await requireAlunoPage();
  if (!ehVisitante(sessao) && !isDemoMode()) notFound();
  const { slug } = await params;
  const t = prontoPorSlug(slug);
  if (!t || (!t.aprovado && !isDemoMode())) notFound();
  const [biblioteca, planoAtivo] = await Promise.all([listarBiblioteca(), getPlanoAtivo(sessao.alunoId)]);
  const plano = planoDoPronto(t, biblioteca.map((i) => i.slug));
  if (!plano) notFound();
  const meta = progressoDesafio(t, "2026-01-01", "2026-01-01", []).meta;
  const temTreinos = planoAtivo.treinos.some((x) => x.ativo && x.autoria === "proprio");
  const pode = podeRegistrar("visitante", sessao.acessoFim ?? null);
  return (
    <div className="space-y-5">
      <Link href="/aluno/treinos-prontos" className="alvo text-sm text-fg-muted hover:text-fg">← Treinos prontos</Link>
      <header className="rounded-2xl border border-accent/40 bg-grain-strong p-5">
        <p className="text-5xl" aria-hidden>{t.emoji}</p>
        <h1 className="mt-2 text-2xl font-black leading-tight">{nomeVisivel(t)}</h1>
        <p className="font-semibold text-accent">{t.chamada}</p>
        <p className="mt-2 text-sm text-fg-muted">{t.descricao}</p>
        {t.inspiracao ? <p className="mt-2 rounded-lg bg-bg/50 px-3 py-2 text-xs text-fg-muted">💡 {t.inspiracao}</p> : null}
        <p className="mt-2 text-xs text-fg-subtle">{ROTULO_NIVEL[t.parametros.nivel]} · {t.parametros.dias} treinos por semana · ~{t.parametros.minutos} min{t.parametros.local === "casa" ? " · em casa" : ""}</p>
      </header>
      <section className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
        <p className="font-bold">🏁 Desafio {t.desafioDias} dias</p>
        <p className="text-fg-muted">Complete {meta} treinos em {t.desafioDias} dias. O app mostra seu progresso em Meus treinos.</p>
      </section>
      <OpcaoPlanoCard opcao={opcaoParaTela(plano, biblioteca)} titulo="Os treinos" />
      {pode ? <ComecarPronto slug={t.slug} temTreinos={temTreinos} /> : <p className="text-sm text-fg-muted">Seu acesso terminou. Para voltar a treinar, fale com o Montinho.</p>}
      <AvisoBaseCientifica />
    </div>
  );
}
