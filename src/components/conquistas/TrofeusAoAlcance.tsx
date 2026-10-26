// Aviso no topo da tela de troféus: quantos dá para ganhar nos próximos dias
// e o que fazer em cada um (ao-alcance.ts). Lista curta; o resto abre no toque.
import type { ItemAlcance } from "@/lib/conquistas/ao-alcance";
import { DIAS_ALCANCE } from "@/lib/conquistas/ao-alcance";

const VISIVEIS = 4;

function Linha({ i }: { i: ItemAlcance }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-accent/60 bg-bg font-mono text-[10px] font-bold text-accent" aria-hidden>
        {i.selo}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-sm font-bold">{i.titulo}</span>
          {i.quando ? <span className="text-[11px] font-semibold text-accent">{i.quando}</span> : null}
        </span>
        <span className="block text-xs text-fg-muted">{i.oQueFazer}</span>
      </span>
    </li>
  );
}

export function TrofeusAoAlcance({ itens }: { itens: ItemAlcance[] }) {
  if (!itens.length) return null;
  const n = itens.length;
  return (
    <section role="status" aria-labelledby="alcance-titulo" className="rounded-xl border border-accent/60 bg-accent/10 px-4 py-3">
      <p id="alcance-titulo" className="flex items-center gap-2 text-sm font-bold">
        <span aria-hidden>🔔</span>
        <span>
          Você pode ganhar <span className="text-accent">{n} {n === 1 ? "troféu" : "troféus"}</span> nos próximos {DIAS_ALCANCE} dias
        </span>
      </p>
      <ul className="mt-1 divide-y divide-border/60">
        {itens.slice(0, VISIVEIS).map((i) => <Linha key={i.codigo} i={i} />)}
      </ul>
      {n > VISIVEIS ? (
        <details className="group">
          <summary className="alvo cursor-pointer list-none py-1 text-xs font-semibold text-accent">
            <span className="group-open:hidden">Ver mais {n - VISIVEIS} →</span>
            <span className="hidden group-open:inline">Ver menos</span>
          </summary>
          <ul className="divide-y divide-border/60">
            {itens.slice(VISIVEIS).map((i) => <Linha key={i.codigo} i={i} />)}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
