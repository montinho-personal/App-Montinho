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

/** Peso levantado hoje × último treino × média, em barras (o de hoje em dourado). */
function BarrasVolume({ r, letra }: { r: RelatorioConclusao; letra?: string | null }) {
  const daPct = (pct: number) => r.volumeKg / (1 + pct / 100);
  const linhas: Array<{ rotulo: string; kg: number; hoje?: boolean; pct?: number }> = [{ rotulo: "Hoje", kg: r.volumeKg, hoje: true }];
  if (r.anterior?.volumePct != null) linhas.push({ rotulo: letra ? `Último treino ${letra}` : "Último treino", kg: daPct(r.anterior.volumePct), pct: r.anterior.volumePct });
  if (r.media) linhas.push({ rotulo: `Sua média (${r.media.treinos})`, kg: daPct(r.media.volumePct), pct: r.media.volumePct });
  const max = Math.max(...linhas.map((l) => l.kg), 1);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-fg-muted">🏋️ Peso levantado (kg × repetições)</p>
      {linhas.map((l, i) => (
        <div key={l.rotulo}>
          <div className="flex items-baseline justify-between text-xs">
            <span className={l.hoje ? "font-bold" : "text-fg-muted"}>{l.rotulo}</span>
            <span className="font-mono">{kg(Math.round(l.kg))}</span>
          </div>
          <div className="mt-0.5 h-3 overflow-hidden rounded-full bg-border/60">
            <div className={`barra-cresce h-full rounded-full ${l.hoje ? "bg-accent" : "bg-fg-subtle/50"}`} style={{ width: `${Math.max(4, (l.kg / max) * 100)}%`, animationDelay: `${i * 120}ms` }} />
          </div>
        </div>
      ))}
      <p className="text-xs text-fg-muted">🔁 {r.repsTotais} repetições no total</p>
      <p className="text-sm">
        {r.anterior?.volumePct != null ? <Variacao pct={r.anterior.volumePct} base={letra ? `vs último treino ${letra}` : "vs último treino"} /> : r.media ? <Variacao pct={r.media.volumePct} base="vs sua média" /> : null}
      </p>
    </div>
  );
}

/** Exercícios comparados à última vez: barra dividida em melhorou / manteve / abaixo. */
function BarraExercicios({ e }: { e: RelatorioConclusao["exercicios"] }) {
  const total = e.melhorou + e.igual + e.abaixo || 1;
  const partes = [
    { n: e.melhorou, cor: "bg-success", texto: "melhorou", classe: "text-success font-bold" },
    { n: e.igual, cor: "bg-fg-subtle/50", texto: "manteve", classe: "text-fg-muted" },
    { n: e.abaixo, cor: "bg-border", texto: "abaixo", classe: "text-fg-muted" },
  ].filter((p) => p.n > 0);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-fg-muted">Seus exercícios comparados à última vez</p>
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={partes.map((p) => `${p.n} ${p.texto}`).join(", ")}>
        {partes.map((p, i) => <div key={p.texto} className={`barra-cresce h-full ${p.cor}`} style={{ width: `${(p.n / total) * 100}%`, animationDelay: `${i * 150}ms` }} />)}
      </div>
      <p className="flex flex-wrap gap-x-3 text-sm">
        {partes.map((p) => (
          <span key={p.texto} className={p.classe}>
            {p.texto === "melhorou" ? "▲" : p.texto === "manteve" ? "=" : "▼"} {p.n} {p.texto}
          </span>
        ))}
      </p>
    </div>
  );
}

export function RelatorioTreino({ r, letra }: { r: RelatorioConclusao; letra?: string | null }) {
  const e = r.exercicios;
  const outrosRecordes = r.recordesVida.filter((x) => !(r.maiorPeso?.recordeVida && x.exercicio === r.maiorPeso.exercicio));
  const difMin = r.anterior?.duracaoDifMin ?? 0;
  const temBarras = r.volumeKg > 0 && (r.anterior?.volumePct != null || r.media != null);
  return (
    <div className="space-y-3 rounded-2xl border border-accent/40 bg-accent/[0.06] p-4">
      <p className="text-sm font-extrabold uppercase tracking-wide text-accent">📊 Como foi o seu treino</p>

      {temBarras ? null : <div className={`grid gap-2 ${r.volumeKg > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
        {r.volumeKg > 0 && !temBarras ? (
          <div className="rounded-xl bg-surface p-3">
            <p className="font-mono text-2xl font-black leading-none">{kg(r.volumeKg)}</p>
            <p className="mt-1 text-xs font-semibold text-fg-muted">🏋️ peso levantado</p>
          </div>
        ) : null}
        <div className="rounded-xl bg-surface p-3">
          <p className="font-mono text-2xl font-black leading-none">{r.repsTotais}</p>
          <p className="mt-1 text-xs font-semibold text-fg-muted">🔁 repetições</p>
        </div>
      </div>}

      {temBarras ? <BarrasVolume r={r} letra={letra} /> : null}

      {e.comparaveis ? <BarraExercicios e={e} /> : null}

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
