"use client";

import { useMemo, useState } from "react";
import type { Evolucao } from "@/lib/supabase/types";
import { dataBR } from "@/lib/format";

const CAMPOS = [
  ["peso_kg", "Peso", "kg"],
  ["gordura_pct", "Gordura", "%"],
  ["cintura_cm", "Cintura", "cm"],
  ["quadril_cm", "Quadril", "cm"],
  ["braco_cm", "Braço", "cm"],
  ["coxa_cm", "Coxa", "cm"],
  ["peito_cm", "Peito", "cm"],
] as const;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
const br = (v: number, casas = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: casas });

/**
 * Antes × depois das medidas. Diferença em cor NEUTRA, com seta: o app não
 * sabe se aumentar braço ou diminuir cintura é o objetivo de cada aluno —
 * quem interpreta é o Montinho (regra de rótulos neutros).
 */
export function ComparadorMedidas({ evolucao, titulo }: { evolucao: Evolucao[]; titulo?: string }) {
  const ordenados = useMemo(() => [...evolucao].sort((a, b) => (a.data < b.data ? -1 : 1)), [evolucao]);
  const [aId, setAId] = useState(ordenados[0]?.id ?? "");
  const [bId, setBId] = useState(ordenados.at(-1)?.id ?? "");
  const a = ordenados.find((x) => x.id === aId);
  const b = ordenados.find((x) => x.id === bId);

  if (ordenados.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-fg-subtle">
        Precisa de pelo menos dois registros de medidas para comparar.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {titulo ? <p className="text-sm font-semibold">{titulo}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
          Antes
          <select value={aId} onChange={(e) => setAId(e.target.value)} className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-sm font-normal text-fg">
            {ordenados.map((e) => (
              <option key={e.id} value={e.id}>
                {dataBR(e.data)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
          Depois
          <select value={bId} onChange={(e) => setBId(e.target.value)} className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-sm font-normal text-fg">
            {ordenados.map((e) => (
              <option key={e.id} value={e.id}>
                {dataBR(e.data)}
              </option>
            ))}
          </select>
        </label>
      </div>
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
          {CAMPOS.map(([key, label, unit]) => {
            const av = num(a?.[key]);
            const bv = num(b?.[key]);
            if (av == null && bv == null) return null;
            const delta = av != null && bv != null ? Math.round((bv - av) * 10) / 10 : null;
            return (
              <tr key={key} className="border-t border-border">
                <td className="py-2 font-semibold">{label}</td>
                <td className="py-2 text-right font-mono">{av != null ? `${br(av)} ${unit}` : "—"}</td>
                <td className="py-2 text-right font-mono">{bv != null ? `${br(bv)} ${unit}` : "—"}</td>
                <td className="py-2 text-right font-mono text-fg-muted">{delta == null ? "—" : delta === 0 ? "igual" : `${delta > 0 ? "↑ +" : "↓ −"}${br(Math.abs(delta))} ${unit}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-fg-subtle">A seta mostra só se a medida subiu ou desceu. Se isso é bom depende do objetivo, e quem interpreta é o personal.</p>
    </div>
  );
}
