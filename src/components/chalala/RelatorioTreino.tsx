// Relatório curto na conclusão do treino (dados em src/lib/relatorios/conclusao.ts).
// 17/11/2026 (pedido do Montinho: “bater o olho e ler”): números grandes em
// blocos, recordes em destaque; o “100%” e a duração já estão no topo da tela.
import type { RelatorioConclusao } from "@/lib/relatorios/conclusao";

const kg = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;

function Variacao({ pct, base }: { pct: number | null; base: string }) {
  if (pct == null) return null;
  if (Math.abs(pct) < 2) return <span className="text-fg-muted">= igual {base}</span>;
  return pct > 0 ? <span className="font-bold text-success">▲ {pct}% {base}</span> : <span className="text-fg-muted">▼ {Math.abs(pct)}% {base}</span>;
}

export function RelatorioTreino({ r, letra }: { r: RelatorioConclusao; letra?: string | null }) {
  const doTreino = letra ? `vs último treino ${letra}` : "vs último treino";
  const e = r.exercicios;
  const outrosRecordes = r.recordesVida.filter((x) => !(r.maiorPeso?.recordeVida && x.exercicio === r.maiorPeso.exercicio));
  const difMin = r.anterior?.duracaoDifMin ?? 0;
  return (
    <div className="space-y-3 rounded-2xl border border-accent/40 bg-accent/[0.06] p-4">
      <p className="text-sm font-extrabold uppercase tracking-wide text-accent">📊 Como foi o seu treino</p>

      <div className="grid grid-cols-2 gap-2">
        {r.volumeKg > 0 ? (
          <div className="rounded-xl bg-surface p-3">
            <p className="font-mono text-2xl font-black leading-none">{kg(r.volumeKg)}</p>
            <p className="mt-1 text-xs font-semibold text-fg-muted">🏋️ peso levantado</p>
          </div>
        ) : null}
        <div className="rounded-xl bg-surface p-3">
          <p className="font-mono text-2xl font-black leading-none">{r.repsTotais}</p>
          <p className="mt-1 text-xs font-semibold text-fg-muted">🔁 repetições</p>
        </div>
      </div>

      {r.volumeKg > 0 && (r.anterior?.volumePct != null || r.media) ? (
        <div className="space-y-0.5 text-sm">
          {r.anterior?.volumePct != null ? <p><Variacao pct={r.anterior.volumePct} base={doTreino} /></p> : null}
          {r.media ? <p><Variacao pct={r.media.volumePct} base={`vs sua média (${r.media.treinos} ${r.media.treinos === 1 ? "treino" : "treinos"})`} /></p> : null}
        </div>
      ) : null}

      {e.comparaveis ? (
        <div className="flex flex-wrap gap-1.5 text-sm">
          {e.melhorou ? <span className="rounded-full bg-success/15 px-3 py-1 font-bold text-success">▲ melhorou em {e.melhorou} {e.melhorou === 1 ? "exercício" : "exercícios"}</span> : null}
          {e.igual ? <span className="rounded-full bg-border px-3 py-1 text-fg-muted">= manteve em {e.igual}</span> : null}
          {e.abaixo ? <span className="rounded-full bg-border px-3 py-1 text-fg-muted">▼ abaixo em {e.abaixo}</span> : null}
        </div>
      ) : null}

      {difMin < 0 ? <p className="text-sm font-semibold">⏱ {Math.abs(difMin)} min mais rápido que da última vez</p> : null}

      {r.maiorPeso ? (
        <div className={`rounded-xl p-3 ${r.maiorPeso.recordeVida ? "border border-accent/60 bg-accent/10" : "bg-surface"}`}>
          <p className="text-xs font-semibold text-fg-muted">{r.maiorPeso.recordeVida ? "⭐ Recorde da vida!" : "🏋 Maior peso de hoje"}</p>
          <p className="text-lg font-extrabold leading-tight">
            {r.maiorPeso.exercicio} · <span className="text-accent">{kg(r.maiorPeso.carga)}</span>
          </p>
          {r.maiorPeso.recordeVida ? <p className="text-xs text-fg-muted">O maior peso que você já registrou nesse exercício.</p> : null}
        </div>
      ) : null}

      {outrosRecordes.length ? (
        <div className="space-y-1.5">
          <p className="text-sm font-extrabold text-accent">⭐ {r.maiorPeso?.recordeVida ? "Mais recordes" : "Recordes"} da vida hoje</p>
          <ul className="space-y-1.5">
            {outrosRecordes.slice(0, 4).map((x) => (
              <li key={x.exercicio} className="flex items-baseline justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{x.exercicio}</span>
                <span className="shrink-0">
                  <strong className="text-base">{kg(x.carga)}</strong> <span className="text-xs text-fg-muted">antes {kg(x.antes)}</span>
                </span>
              </li>
            ))}
            {outrosRecordes.length > 4 ? <li className="px-1 text-xs text-fg-muted">e mais {outrosRecordes.length - 4}.</li> : null}
          </ul>
        </div>
      ) : null}
      {(r.anterior?.volumePct ?? 0) < -2 || e.abaixo ? <p className="text-[11px] text-fg-subtle">Oscilar faz parte: sono, rotina e recuperação mudam o desempenho de um dia para o outro.</p> : null}
    </div>
  );
}
