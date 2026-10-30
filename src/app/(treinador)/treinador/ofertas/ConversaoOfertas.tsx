// Conversão por lugar (Fase 3): onde cada oferta foi vista e quantas vezes
// levou ao WhatsApp nos últimos 30 dias. Contas em src/lib/ofertas/regras.ts.
import type { LinhaConversao } from "@/lib/ofertas/regras";

const OFERTA: Record<string, string> = { consultoria: "Consultoria", pacote: "Pacote Flexível", presencial: "Presencial" };

export function ConversaoOfertas({ linhas }: { linhas: LinhaConversao[] }) {
  const vistas = linhas.reduce((n, l) => n + l.vistas, 0);
  const cliques = linhas.reduce((n, l) => n + l.cliques, 0);
  const melhor = [...linhas].filter((l) => l.vistas >= 5 && l.taxa !== null).sort((a, b) => (b.taxa ?? 0) - (a.taxa ?? 0))[0];
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-label="Conversão por lugar">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">📊 Conversão por lugar (30 dias)</h2>
        <span className="text-xs text-fg-subtle">{vistas} vistas · {cliques} no WhatsApp</span>
      </div>
      {linhas.length === 0 ? (
        <p className="text-sm text-fg-muted">Ainda não há dados. Assim que alunos e visitantes virem as ofertas, aparece aqui onde cada uma converte mais.</p>
      ) : (
        <>
          {melhor ? <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm"><strong>Onde mais converte:</strong> {melhor.rotulo} · {OFERTA[melhor.oferta] ?? melhor.oferta} para {melhor.publico === "visitante" ? "visitantes" : "alunos"} ({String(melhor.taxa).replace(".", ",")}% chamam no WhatsApp).</p> : null}
          <ul className="divide-y divide-border">
            {linhas.map((l) => (
              <li key={`${l.lugar}-${l.oferta}-${l.publico}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{l.rotulo}</p>
                  <p className="text-xs text-fg-muted">{OFERTA[l.oferta] ?? l.oferta} · {l.publico === "visitante" ? "visitantes" : "alunos"}</p>
                </div>
                <div className="shrink-0 text-right font-mono text-xs">
                  <p><span className="text-fg-muted">vistas</span> {l.vistas} · <span className="text-success">WhatsApp</span> {l.cliques} · <span className="text-fg-muted">não</span> {l.dispensas}</p>
                  <p className="text-sm font-bold">{l.taxa === null ? "—" : `${String(l.taxa).replace(".", ",")}%`}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-fg-subtle">% = quantos tocaram no WhatsApp a cada 100 que viram. As páginas (Consultoria, Pacote, Presencial) contam só os toques.</p>
        </>
      )}
    </section>
  );
}
