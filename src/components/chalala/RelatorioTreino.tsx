// Relatório curto na conclusão do treino (dados em src/lib/relatorios/conclusao.ts).
import type { RelatorioConclusao } from "@/lib/relatorios/conclusao";

const kg = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;

function Variacao({ pct, base }: { pct: number | null; base: string }) {
  if (pct == null) return null;
  if (Math.abs(pct) < 2) return <span className="text-fg-muted">igual {base}</span>;
  return pct > 0 ? <span className="font-semibold text-success">▲ {pct}% {base}</span> : <span className="text-fg-muted">▼ {Math.abs(pct)}% {base}</span>;
}

export function RelatorioTreino({ r, letra }: { r: RelatorioConclusao; letra?: string | null }) {
  const doTreino = letra ? `vs último treino ${letra}` : "vs último treino";
  const e = r.exercicios;
  const outrosRecordes = r.recordesVida.filter((x) => !(r.maiorPeso?.recordeVida && x.exercicio === r.maiorPeso.exercicio));
  return (
    <div className="space-y-3 rounded-xl border border-accent/40 bg-accent/[0.06] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">📊 Relatório do treino</p>
      <p className="text-base font-bold">{r.completo ? "🏆 Parabéns! Você completou 100% do treino." : `Você fez ${r.pct}% do treino planejado.`}</p>

      <ul className="space-y-2 text-sm">
        {r.volumeKg > 0 ? (
          <li className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span>Volume total <span className="text-fg-subtle">(kg × repetições)</span></span>
            <span className="font-mono font-bold">{kg(r.volumeKg)}</span>
            <span className="w-full text-xs">
              <Variacao pct={r.anterior?.volumePct ?? null} base={doTreino} />
              {r.media ? <> · <Variacao pct={r.media.volumePct} base={`vs sua média (${r.media.treinos} treinos)`} /></> : null}
            </span>
          </li>
        ) : null}
        <li className="flex items-baseline justify-between gap-2">
          <span>Repetições</span>
          <span className="font-mono font-bold">{r.repsTotais}</span>
        </li>
        {r.duracaoMin != null ? (
          <li className="flex items-baseline justify-between gap-2">
            <span>Duração</span>
            <span className="font-mono font-bold">
              {r.duracaoMin} min
              {r.anterior?.duracaoDifMin ? <span className="ml-1 text-xs font-normal text-fg-muted">({r.anterior.duracaoDifMin > 0 ? "+" : "−"}{Math.abs(r.anterior.duracaoDifMin)} min)</span> : null}
            </span>
          </li>
        ) : null}
        {e.comparaveis ? (
          <li>
            <span>Por exercício, comparado à última vez:</span>
            <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {e.melhorou ? <span className="rounded-full bg-success/15 px-2 py-0.5 font-semibold text-success">▲ melhorou em {e.melhorou}</span> : null}
              {e.igual ? <span className="rounded-full bg-border px-2 py-0.5 text-fg-muted">= manteve em {e.igual}</span> : null}
              {e.abaixo ? <span className="rounded-full bg-border px-2 py-0.5 text-fg-muted">▼ abaixo em {e.abaixo}</span> : null}
            </span>
          </li>
        ) : null}
        {r.maiorPeso ? (
          <li className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span>🏋 Maior peso de hoje</span>
            <span className="font-bold">
              {r.maiorPeso.exercicio} · {kg(r.maiorPeso.carga)}
            </span>
            {r.maiorPeso.recordeVida ? <span className="w-full text-xs font-semibold text-accent">★ O maior peso que você já registrou nesse exercício!</span> : null}
          </li>
        ) : null}
        {outrosRecordes.length ? (
          <li>
            <span className="font-semibold text-accent">★ {r.maiorPeso?.recordeVida ? "Outros recordes" : "Recordes"} da vida hoje</span>
            <ul className="mt-1 space-y-0.5 text-xs">
              {outrosRecordes.slice(0, 4).map((x) => (
                <li key={x.exercicio}>
                  {x.exercicio}: <strong>{kg(x.carga)}</strong> <span className="text-fg-muted">(antes {kg(x.antes)})</span>
                </li>
              ))}
              {outrosRecordes.length > 4 ? <li className="text-fg-muted">e mais {outrosRecordes.length - 4}.</li> : null}
            </ul>
          </li>
        ) : null}
      </ul>
      {(r.anterior?.volumePct ?? 0) < -2 || e.abaixo ? <p className="text-[11px] text-fg-subtle">Oscilar faz parte: sono, rotina e recuperação mudam o desempenho de um dia para o outro.</p> : null}
    </div>
  );
}
