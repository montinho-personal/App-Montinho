"use client";

// Conquistas da turma por semana / 15 dias / mês (pedido do Montinho,
// 01/11/2026). Uma série só (barras na cor da marca), o período atual mais
// claro por estar em andamento, tocar numa barra mostra o número e quantos
// alunos ganharam. Contas em src/lib/conquistas/grafico-conquistas.ts.
import { useMemo, useState } from "react";
import { barrasDeConquistas, fraseDaTendencia, NOME_AGRUPAMENTO, type Agrupamento } from "@/lib/conquistas/grafico-conquistas";

const ABAS: Agrupamento[] = ["semana", "quinzena", "mes"];
const ALTURA = 160;

export function GraficoConquistas({ historico }: { historico: Array<{ alunoId: string; em: string }> }) {
  const [agr, setAgr] = useState<Agrupamento>("semana");
  const barras = useMemo(() => barrasDeConquistas(historico, agr), [historico, agr]);
  const [sel, setSel] = useState<number | null>(null);
  const escolhida = sel != null ? barras[sel] : barras[barras.length - 1];
  const max = Math.max(1, ...barras.map((b) => b.total));
  const frase = fraseDaTendencia(barras, agr);
  const nomes = NOME_AGRUPAMENTO[agr];
  const media = Math.round(barras.filter((b) => !b.atual).reduce((s, b) => s + b.total, 0) / Math.max(1, barras.length - 1));

  return (
    <section aria-label="Conquistas por período" className="space-y-3 rounded-xl border border-accent/40 bg-card p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">📈 Conquistas da turma</p>
        <p className="text-xs text-fg-muted">Mais troféus = mais gente treinando e cumprindo a meta. Só alunos (sem visitantes).</p>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-bg p-1" role="tablist" aria-label="Agrupar por">
        {ABAS.map((a) => (
          <button key={a} type="button" role="tab" aria-selected={agr === a} onClick={() => { setAgr(a); setSel(null); }} className={`min-h-10 rounded-lg text-xs font-bold ${agr === a ? "bg-accent text-bg" : "text-fg-muted"}`}>
            {NOME_AGRUPAMENTO[a].aba}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-bg/60 px-3 py-2" aria-live="polite">
        <p className="text-2xl font-black">{escolhida.total} <span className="text-sm font-semibold text-fg-muted">{escolhida.total === 1 ? "conquista" : "conquistas"}</span></p>
        <p className="text-xs text-fg-muted">
          {escolhida.atual ? `${nomes.atual[0].toUpperCase()}${nomes.atual.slice(1)} (em andamento)` : escolhida.rotulo} · {escolhida.pessoas} {escolhida.pessoas === 1 ? "aluno ganhou" : "alunos ganharam"}
          {" "}· média {media} por {agr === "mes" ? "mês" : agr === "quinzena" ? "quinzena" : "semana"}
        </p>
      </div>

      <div className="relative" style={{ height: ALTURA + 22 }}>
        {/* linha da média dos períodos fechados */}
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-fg-subtle/50" style={{ bottom: 22 + (media / max) * ALTURA }} aria-hidden>
        </div>
        <div className="absolute inset-x-0 bottom-[22px] border-t border-border" aria-hidden />
        <ol className="absolute inset-0 flex items-end gap-[2px]">
          {barras.map((b, i) => {
            const h = b.total ? Math.max(4, (b.total / max) * ALTURA) : 0;
            const ativa = sel === i || (sel == null && b.atual);
            return (
              <li key={b.inicio} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <button type="button" onClick={() => setSel(i)} aria-label={`${b.atual ? nomes.atual : b.rotulo}: ${b.total} conquistas, ${b.pessoas} alunos`} className="flex w-full flex-1 flex-col items-center justify-end">
                  {ativa ? <span className="mb-0.5 text-[10px] font-bold">{b.total}</span> : null}
                  <span className={`block w-full max-w-7 rounded-t ${b.atual ? "bg-accent/45" : "bg-accent"} ${ativa ? "ring-2 ring-fg/70" : ""}`} style={{ height: h }} />
                </button>
                <span className={`mt-1 h-[18px] whitespace-nowrap text-center text-[10px] ${ativa ? "font-bold text-fg" : "text-fg-subtle"}`}>{(barras.length - 1 - i) % 3 === 0 ? b.rotulo : ""}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {frase ? <p className="text-sm font-semibold">{frase}</p> : null}
      <p className="text-[11px] text-fg-subtle">Toque numa barra para ver o número. A barra mais clara é {nomes.atual}, que ainda não acabou. Linha tracejada = média dos períodos fechados.</p>
    </section>
  );
}
