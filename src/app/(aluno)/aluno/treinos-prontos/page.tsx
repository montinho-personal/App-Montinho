// Vitrine “Treinos prontos do Montinho” (Modo Visitante).
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { ABAS_PUBLICO, abaDoSexo, filtrarVitrine, nomeVisivel, prontosVisiveis, type AbaPublico, type FiltroNivel } from "@/lib/visitante/treinos-prontos";
import { ROTULO_NIVEL } from "@/lib/visitante/gerar-treino";
import { getAluno } from "@/lib/db";
import { AvisoBaseCientifica } from "@/components/visitante/AvisoBaseCientifica";

export const metadata = { title: "Treinos prontos" };

const NIVEIS: Array<{ id: FiltroNivel; rotulo: string }> = [
  { id: "todos", rotulo: "Todos os níveis" },
  { id: "iniciante", rotulo: "Iniciante" },
  { id: "intermediario", rotulo: "Intermediário" },
  { id: "avancado", rotulo: "Avançado" },
];

export default async function TreinosProntosPage({ searchParams }: { searchParams: Promise<{ publico?: string; nivel?: string }> }) {
  if (!FEATURES.modoVisitante) notFound();
  const sessao = await requireAlunoPage();
  if (!ehVisitante(sessao) && !isDemoMode()) notFound();
  const sp = await searchParams;
  const todos = prontosVisiveis(isDemoMode());
  // Sem escolha ainda: começa pela aba do sexo do cadastro.
  const aba: AbaPublico = ABAS_PUBLICO.some((a) => a.id === sp.publico) ? (sp.publico as AbaPublico) : abaDoSexo((await getAluno(sessao.alunoId).catch(() => null))?.sexo);
  const niveisComTreino = NIVEIS.filter((n) => n.id === "todos" || filtrarVitrine(todos, aba, n.id).length);
  const nivel: FiltroNivel = niveisComTreino.some((n) => n.id === sp.nivel) ? (sp.nivel as FiltroNivel) : "todos";
  const lista = filtrarVitrine(todos, aba, nivel);
  const href = (a: AbaPublico, n: FiltroNivel) => `/aluno/treinos-prontos?publico=${a}${n === "todos" ? "" : `&nivel=${n}`}`;
  const chip = (ativo: boolean) => `alvo rounded-full border px-3 py-1.5 text-sm font-semibold ${ativo ? "border-accent bg-accent text-bg" : "border-border bg-card text-fg-muted hover:text-fg"}`;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">🔥 Treinos prontos</h1>
        <Link href="/aluno/meus-treinos" className="alvo text-sm text-fg-muted hover:text-fg">← Meus treinos</Link>
      </div>
      <p className="text-sm text-fg-muted">Escolha um, toque em “Começar” e ele entra em Meus treinos. Cada um vem com um desafio para você não parar.</p>
      <section className="space-y-3" aria-label="Filtros">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-fg-subtle">Para quem é o treino?</p>
          <nav className="flex gap-1 rounded-xl border border-border bg-card p-1" aria-label="Público">
            {ABAS_PUBLICO.map((a) => (
              <Link key={a.id} href={href(a.id, "todos")} aria-current={aba === a.id ? "page" : undefined} className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold ${aba === a.id ? "bg-accent text-bg" : "text-fg-muted hover:text-fg"}`}>{a.rotulo}</Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-fg-subtle">Seu nível</p>
          <div className="flex flex-wrap gap-2">
            {niveisComTreino.map((n) => (
              <Link key={n.id} href={href(aba, n.id)} aria-current={nivel === n.id ? "page" : undefined} className={chip(nivel === n.id)}>{n.rotulo}</Link>
            ))}
          </div>
        </div>
        {aba !== "todos" ? (
          <p className="rounded-xl border border-border bg-bg/40 px-3 py-2 text-xs text-fg-muted">
            🔬 Homens e mulheres ganham músculo em proporção parecida com o mesmo tipo de treino. Por isso o método é o mesmo; o que muda são as prioridades
            {aba === "feminino" ? " (glúteo e pernas mais vezes na semana) e um descanso um pouco menor nos exercícios grandes, porque as mulheres costumam se recuperar mais rápido entre as séries." : " (peito, costas, ombros e braços em destaque, sem esquecer as pernas)."}
          </p>
        ) : null}
      </section>
      {lista.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lista.map((t) => (
            <li key={t.slug}>
              <Link href={`/aluno/treinos-prontos/${t.slug}`} className="flex h-full gap-3 rounded-2xl border border-border bg-card p-4 hover:border-accent/60">
                <span className="text-4xl" aria-hidden>{t.emoji}</span>
                <span className="min-w-0 space-y-1">
                  <span className="block font-bold leading-tight">{nomeVisivel(t)}</span>
                  <span className="block text-xs text-fg-muted">{t.chamada}</span>
                  <span className="block text-[11px] text-fg-subtle">{t.publico === "feminino" ? "Feminino · " : t.publico === "masculino" ? "Masculino · " : ""}{ROTULO_NIVEL[t.parametros.nivel]} · {t.parametros.dias}×/semana · ~{t.parametros.minutos} min{t.parametros.local === "casa" ? " · em casa" : ""}</span>
                  <span className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">Desafio {t.desafioDias} dias</span>
                  {!t.aprovado ? <span className="ml-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] text-fg-subtle">aguardando aprovação</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">{todos.length ? "Nenhum treino pronto com esse filtro ainda. Tente outro nível ou o ✨ Monte com IA." : "Os treinos prontos estão chegando. Enquanto isso, experimente o ✨ Monte com IA."}</p>
      )}
      <AvisoBaseCientifica />
    </div>
  );
}
