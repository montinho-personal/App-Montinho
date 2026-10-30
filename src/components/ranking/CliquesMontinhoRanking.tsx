// Painel do personal: quem tocou em “Ver 👀” do Montinho no Ranking (e quem
// compartilhou o card “vou passar/passei o Montinho”). Dados internos do app,
// valem também para quem não aceitou o Google Analytics.
import type { ResumoCliquesMontinho } from "@/lib/ranking/montinho-cliques";

const FMT = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function CliquesMontinhoRanking({ r, dias }: { r: ResumoCliquesMontinho; dias: number }) {
  return (
    <section aria-label="Quem viu o Montinho no ranking" className="space-y-3 rounded-2xl border border-accent/40 bg-surface p-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">🕵️ “Você sabia?” do Montinho · últimos {dias} dias</p>
        <p className="text-sm text-fg-muted">Quem tocou em “Ver 👀” para ver em que lugar você estaria e quantos troféus tem.</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border bg-bg/60 p-2"><p className="text-2xl font-black">{r.pessoas}</p><p className="text-[11px] text-fg-muted">{r.pessoas === 1 ? "pessoa" : "pessoas"}</p></div>
        <div className="rounded-xl border border-border bg-bg/60 p-2"><p className="text-2xl font-black">{r.vezes}</p><p className="text-[11px] text-fg-muted">{r.vezes === 1 ? "toque" : "toques"}</p></div>
        <div className="rounded-xl border border-border bg-bg/60 p-2"><p className="text-2xl font-black">{r.compartilharam}</p><p className="text-[11px] text-fg-muted">compartilharam</p></div>
      </div>
      {r.lista.length ? (
        <details className="rounded-xl border border-border">
          <summary className="alvo cursor-pointer px-3 py-2 text-sm font-semibold">Ver quem foi ({r.lista.length})</summary>
          <ul className="divide-y divide-border">
            {r.lista.map((p) => (
              <li key={p.alunoId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold">{p.nome}</span>
                  {p.visitante ? <span className="ml-1 rounded-full bg-fg/10 px-1.5 py-0.5 text-[10px] text-fg-muted">visitante</span> : null}
                  <span className="block text-[11px] text-fg-subtle">Última vez: {FMT.format(new Date(p.ultima))}</span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  <span className="block font-bold">{p.vezes}× viu</span>
                  {p.compartilhou ? <span className="block text-accent">📲 compartilhou</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-xs text-fg-subtle">Ninguém tocou ainda. A contagem começou em 30/10/2026.</p>
      )}
    </section>
  );
}
