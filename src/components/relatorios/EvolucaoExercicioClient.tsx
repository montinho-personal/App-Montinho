"use client";

import { useMemo, useState } from "react";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { evolucaoExercicio, type ResumoEvolucao } from "@/lib/relatorios/calcular";
import { dataBR } from "@/lib/format";

/** Seleciona um exercício e mostra sua evolução (carga máxima e e1RM por data) em gráfico simples + tabela. */
export function EvolucaoExercicioClient({ sessoes, exercicios: todos, resumos = [] }: { sessoes: SessaoCompleta[]; exercicios: Array<{ chave: string; nome: string; grupo?: string | null }>; resumos?: ResumoEvolucao[] }) {
  const grupos = [...new Set(todos.map((e) => e.grupo).filter((g): g is string => !!g))].sort();
  const [grupo, setGrupo] = useState("");
  const exercicios = grupo ? todos.filter((e) => e.grupo === grupo) : todos;
  const [escolhido, setChave] = useState(todos[0]?.chave ?? "");
  const chave = exercicios.some((e) => e.chave === escolhido) ? escolhido : (exercicios[0]?.chave ?? "");
  const pontos = useMemo(() => evolucaoExercicio(sessoes, chave, resumos), [sessoes, chave, resumos]);
  const valores = pontos.map((p) => p.cargaMax ?? 0);
  const max = Math.max(1, ...valores);
  const min = Math.min(...valores.filter((v) => v > 0), max);
  const W = 320;
  const H = 110;
  const path = pontos
    .map((p, i) => {
      const x = pontos.length > 1 ? (i / (pontos.length - 1)) * (W - 20) + 10 : W / 2;
      const y = H - 10 - ((Math.max(0, p.cargaMax ?? 0) - min) / Math.max(1, max - min)) * (H - 20);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  if (!exercicios.length) return null;
  return (
    <div className="mt-4 space-y-2">
      <label className="block text-xs font-semibold text-fg-muted" htmlFor="sel-exercicio">
        Evolução por exercício
      </label>
      {grupos.length > 1 ? (
        <select aria-label="Filtrar por grupo muscular" value={grupo} onChange={(e) => setGrupo(e.target.value)} className="h-10 w-full rounded-md border border-border bg-bg px-2 text-sm">
          <option value="">Todos os grupos musculares</option>
          {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      ) : null}
      <select id="sel-exercicio" value={chave} onChange={(e) => setChave(e.target.value)} className="h-10 w-full rounded-md border border-border bg-bg px-2 text-sm">
        {exercicios.map((e) => (
          <option key={e.chave} value={e.chave}>
            {e.nome}
          </option>
        ))}
      </select>
      {pontos.length < 2 ? (
        <p className="text-xs text-fg-subtle">Ainda há só {pontos.length} registro para este exercício — a linha aparece a partir de 2.</p>
      ) : (
        <figure>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" role="img" aria-label={`Carga máxima por sessão: ${pontos.map((p) => `${dataBR(p.data)} ${p.cargaMax ?? 0} kg`).join(", ")}`}>
            <line x1="10" y1={H - 10} x2={W - 10} y2={H - 10} stroke="var(--color-border)" />
            <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
            {pontos.map((p, i) => {
              const x = pontos.length > 1 ? (i / (pontos.length - 1)) * (W - 20) + 10 : W / 2;
              const y = H - 10 - ((Math.max(0, p.cargaMax ?? 0) - min) / Math.max(1, max - min)) * (H - 20);
              return p.fonte === "resumo" ? <circle key={p.data} cx={x} cy={y} r="3" fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth="1.5" /> : <circle key={p.data} cx={x} cy={y} r="3" fill="var(--color-accent)" />;
            })}
          </svg>
          <figcaption className="text-[11px] text-fg-subtle">Eixo vertical: carga máxima (kg) · eixo horizontal: sessões em ordem cronológica ({dataBR(pontos[0].data)} → {dataBR(pontos.at(-1)!.data)}).</figcaption>
        </figure>
      )}
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-fg-subtle">
          <tr>
            <th className="text-left py-1">Data</th>
            <th className="text-right py-1">Carga máx.</th>
            <th className="text-right py-1">e1RM</th>
            <th className="text-right py-1">Séries</th>
            <th className="text-right py-1">Tonelagem</th>
          </tr>
        </thead>
        <tbody>
          {pontos
            .slice()
            .reverse()
            .slice(0, 8)
            .map((p) => (
              <tr key={p.data} className="border-t border-border font-mono">
                <td className="py-1 font-sans">
                  {dataBR(p.data)}
                  {p.fonte === "resumo" ? <span className="text-fg-subtle"> *</span> : null}
                </td>
                <td className="py-1 text-right">{p.cargaMax ?? "—"}</td>
                <td className="py-1 text-right">{p.e1rmMax ?? "—"}</td>
                <td className="py-1 text-right">{p.series}</td>
                <td className="py-1 text-right">{p.tonelagem}</td>
              </tr>
            ))}
        </tbody>
      </table>
      {pontos.some((p) => p.fonte === "resumo") ? (
        <p className="text-[11px] text-fg-subtle">* Resumo do app anterior (círculo vazado no gráfico): só carga máxima, séries e volume do dia — sem carga e repetições de cada série, por isso sem e1RM.</p>
      ) : null}
    </div>
  );
}
