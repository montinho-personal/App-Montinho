"use client";

import { useMemo, useState } from "react";
import type { Evolucao } from "@/lib/supabase/types";
import { dataBR } from "@/lib/format";
import { antesDepois, type LinhaAntesDepois } from "@/lib/medidas/leitura";

const br = (v: number, casas = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
const GRUPOS: Array<[LinhaAntesDepois["grupo"], string]> = [
  ["corpo", "Corpo"],
  ["bioimpedancia", "Bioimpedância / avaliação"],
  ["circunferencias", "Circunferências"],
  ["outras", "Outras medidas do laudo"],
];
const textoDif = (l: LinhaAntesDepois) =>
  l.diferenca == null ? "—" : l.diferenca === 0 ? "igual" : `${l.diferenca > 0 ? "↑ +" : "↓ −"}${br(Math.abs(l.diferenca))} ${l.unidade}`;

/**
 * Antes × depois das medidas, em gráfico (barras lado a lado) ou tabela.
 * Diferença em cor NEUTRA, com seta: o app não sabe se aumentar braço ou
 * diminuir cintura é o objetivo de cada aluno — quem interpreta é o Montinho
 * (regra de rótulos neutros). Inclui as medidas extras lidas do laudo (0125).
 */
export function ComparadorMedidas({ evolucao, titulo }: { evolucao: Evolucao[]; titulo?: string }) {
  const ordenados = useMemo(() => [...evolucao].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.created_at < b.created_at ? -1 : 1)), [evolucao]);
  const [aId, setAId] = useState(ordenados[0]?.id ?? "");
  const [bId, setBId] = useState(ordenados.at(-1)?.id ?? "");
  const [modo, setModo] = useState<"grafico" | "tabela">("grafico");
  const a = ordenados.find((x) => x.id === aId);
  const b = ordenados.find((x) => x.id === bId);
  const linhas = useMemo(() => antesDepois(a, b), [a, b]);

  if (ordenados.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-fg-subtle">
        Precisa de pelo menos dois registros de medidas para comparar.
      </div>
    );
  }

  const seletor = (rotulo: string, valor: string, mudar: (v: string) => void) => (
    <label className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
      {rotulo}
      <select value={valor} onChange={(e) => mudar(e.target.value)} className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-sm font-normal text-fg">
        {ordenados.map((e) => (
          <option key={e.id} value={e.id}>
            {dataBR(e.data)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{titulo ?? "📊 Antes × depois"}</p>
        <div className="flex rounded-lg border border-border p-0.5 text-xs" role="tablist">
          {(["grafico", "tabela"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={modo === m} onClick={() => setModo(m)} className={`alvo rounded-md px-2.5 py-1 font-semibold ${modo === m ? "bg-accent text-bg" : "text-fg-muted"}`}>
              {m === "grafico" ? "Gráfico" : "Tabela"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {seletor("Antes", aId, setAId)}
        {seletor("Depois", bId, setBId)}
      </div>

      {modo === "grafico" ? (
        <div className="space-y-4">
          <p className="flex flex-wrap items-center gap-3 text-[11px] text-fg-muted">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded-sm bg-fg-subtle/50" aria-hidden /> Antes ({a ? dataBR(a.data) : "—"})</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded-sm bg-accent" aria-hidden /> Depois ({b ? dataBR(b.data) : "—"})</span>
          </p>
          {GRUPOS.map(([g, rotulo]) => {
            const doGrupo = linhas.filter((l) => l.grupo === g);
            if (!doGrupo.length) return null;
            return (
              <section key={g} className="space-y-2.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{rotulo}</h4>
                {doGrupo.map((l) => {
                  const max = Math.max(l.antes ?? 0, l.depois ?? 0) || 1;
                  return (
                    <div key={l.chave} className="text-xs">
                      <div className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold">{l.rotulo}</span>
                        <span className="shrink-0 font-mono text-fg-muted">{textoDif(l)}</span>
                      </div>
                      {([["antes", l.antes, "bg-fg-subtle/50"], ["depois", l.depois, "bg-accent"]] as const).map(([k, v, cor]) => (
                        <div key={k} className="mt-1 flex items-center gap-2">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                            <div className={`h-full rounded-full ${cor}`} style={{ width: `${v == null ? 0 : Math.max(2, Math.round((v / max) * 100))}%` }} />
                          </div>
                          <span className="w-20 shrink-0 text-right font-mono text-[11px] text-fg-muted">{v == null ? "—" : `${br(v)} ${l.unidade}`}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-fg-subtle">
              <th className="text-left py-1" />
              <th className="text-right py-1">Antes</th>
              <th className="text-right py-1">Depois</th>
              <th className="text-right py-1">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave} className="border-t border-border">
                <td className="py-2 font-semibold">{l.rotulo}</td>
                <td className="py-2 text-right font-mono">{l.antes != null ? `${br(l.antes)} ${l.unidade}` : "—"}</td>
                <td className="py-2 text-right font-mono">{l.depois != null ? `${br(l.depois)} ${l.unidade}` : "—"}</td>
                <td className="py-2 text-right font-mono text-fg-muted">{textoDif(l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-fg-subtle">A seta mostra só se a medida subiu ou desceu. Se isso é bom depende do objetivo, e quem interpreta é o personal.</p>
    </div>
  );
}
