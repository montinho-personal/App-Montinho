// Topo da Evolução do aluno: manchete + 3 números + destaques para deslizar
// (regras puras em src/lib/relatorios/painel-aluno.ts).
import Link from "next/link";
import type { PainelEvolucao, Tom } from "@/lib/relatorios/painel-aluno";

const COR_TOM: Record<Tom, string> = { alta: "text-success", baixa: "text-fg-subtle", igual: "text-fg-subtle", novo: "text-accent" };
const COR_DESTAQUE = { ouro: "border-accent/60 bg-[linear-gradient(160deg,#2a2415_0%,#171717_80%)]", verde: "border-success/40 bg-card", neutro: "border-border bg-card" } as const;

export function PainelEvolucaoAluno({ p, dias, periodos, basePath, anterior }: { p: PainelEvolucao; dias: number; periodos: readonly number[]; basePath: string; anterior: string }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="Período">
        {periodos.map((d) => (
          <Link key={d} href={`${basePath}?dias=${d}`} aria-current={dias === d ? "true" : undefined} className={`touch inline-flex flex-1 items-center justify-center rounded-full border text-sm font-semibold ${dias === d ? "border-accent bg-accent text-bg" : "border-border text-fg-muted"}`}>
            {d === 7 ? "7 dias" : d === 30 ? "30 dias" : "90 dias"}
          </Link>
        ))}
      </div>

      <section aria-label="Resumo da sua evolução" className="space-y-4 rounded-3xl border-2 border-accent bg-[linear-gradient(160deg,#2a2415_0%,#0a0a0a_85%)] p-5">
        <div>
          <p className="text-4xl" aria-hidden>{p.emoji}</p>
          <h2 className="mt-1 text-3xl font-black leading-tight tracking-tight">{p.manchete}</h2>
          <p className="mt-1 text-sm text-fg-muted">{p.sub}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {p.numeros.map((n) => (
            <div key={n.rotulo} className="rounded-2xl bg-black/40 px-2 py-3 text-center">
              <p className="text-2xl font-black leading-none tabular-nums">{n.valor}</p>
              <p className="mt-1 text-[11px] text-fg-muted">{n.rotulo}</p>
              {n.delta ? <p className={`mt-1 text-[11px] font-bold ${COR_TOM[n.delta.tom]}`}>{n.delta.texto}</p> : null}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-fg-subtle">Comparado com {anterior}.</p>
      </section>

      {p.destaques.length ? (
        <section aria-label="Destaques" className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Destaques</h2>
            {p.destaques.length > 1 ? <span className="text-xs text-fg-subtle">deslize →</span> : null}
          </div>
          <ul className="-mx-4 flex items-start snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {p.destaques.map((d) => (
              <li key={d.id} className={`flex w-[72%] max-w-[260px] shrink-0 snap-start flex-col rounded-2xl border p-4 ${COR_DESTAQUE[d.tom]}`}>
                <p className="text-2xl" aria-hidden>{d.emoji}</p>
                <div className="mt-2">
                  <p className="text-sm font-bold leading-snug">{d.titulo}</p>
                  {d.valor ? <p className="mt-1 text-xl font-black text-accent tabular-nums">{d.valor}</p> : null}
                  <p className="mt-1 text-xs leading-snug text-fg-muted">{d.detalhe}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Atalhos da Evolução: tudo a um toque. */
export function AtalhosEvolucao({ alunoId }: { alunoId: string }) {
  const itens = [
    { href: `/relatorio/${alunoId}`, emoji: "📄", titulo: "Relatório completo", texto: "Em PDF, para baixar" },
    { href: "/aluno/vitorias", emoji: "🌟", titulo: "Vitórias da semana", texto: "O que melhorou" },
    { href: "/aluno/cardio", emoji: "❤️‍🔥", titulo: "Cardio", texto: "Semana e histórico" },
    { href: "/aluno/medidas", emoji: "📏", titulo: "Medidas", texto: "Peso, medidas, avaliação" },
  ];
  return (
    <nav aria-label="Atalhos" className="grid grid-cols-2 gap-2">
      {itens.map((i) => (
        <Link key={i.href} href={i.href} className="touch flex flex-col rounded-2xl border border-border bg-card px-3 py-3 hover:border-accent/50">
          <span className="text-2xl" aria-hidden>{i.emoji}</span>
          <span className="mt-1 text-sm font-bold">{i.titulo}</span>
          <span className="text-[11px] text-fg-muted">{i.texto}</span>
        </Link>
      ))}
    </nav>
  );
}
