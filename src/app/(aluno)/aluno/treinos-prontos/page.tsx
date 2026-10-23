// Vitrine “Treinos prontos do Montinho” (Modo Visitante).
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { prontosVisiveis } from "@/lib/visitante/treinos-prontos";
import { ROTULO_NIVEL } from "@/lib/visitante/gerar-treino";
import { AvisoBaseCientifica } from "@/components/visitante/AvisoBaseCientifica";

export const metadata = { title: "Treinos prontos" };

export default async function TreinosProntosPage() {
  if (!FEATURES.modoVisitante) notFound();
  const sessao = await requireAlunoPage();
  if (!ehVisitante(sessao) && !isDemoMode()) notFound();
  const lista = prontosVisiveis(isDemoMode());
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">🔥 Treinos prontos</h1>
        <Link href="/aluno/meus-treinos" className="alvo text-sm text-fg-muted hover:text-fg">← Meus treinos</Link>
      </div>
      <p className="text-sm text-fg-muted">Escolha um, toque em “Começar” e ele entra em Meus treinos. Cada um vem com um desafio para você não parar.</p>
      {lista.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lista.map((t) => (
            <li key={t.slug}>
              <Link href={`/aluno/treinos-prontos/${t.slug}`} className="flex h-full gap-3 rounded-2xl border border-border bg-card p-4 hover:border-accent/60">
                <span className="text-4xl" aria-hidden>{t.emoji}</span>
                <span className="min-w-0 space-y-1">
                  <span className="block font-bold leading-tight">{t.nome}</span>
                  <span className="block text-xs text-fg-muted">{t.chamada}</span>
                  <span className="block text-[11px] text-fg-subtle">{ROTULO_NIVEL[t.parametros.nivel]} · {t.parametros.dias}×/semana · ~{t.parametros.minutos} min{t.parametros.local === "casa" ? " · em casa" : ""}</span>
                  <span className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">Desafio {t.desafioDias} dias</span>
                  {!t.aprovado ? <span className="ml-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] text-fg-subtle">aguardando aprovação</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Os treinos prontos estão chegando. Enquanto isso, experimente o ✨ Monte com IA.</p>
      )}
      <AvisoBaseCientifica />
    </div>
  );
}
