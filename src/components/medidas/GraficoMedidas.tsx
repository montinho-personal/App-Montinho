"use client";

// Gráfico de CADA medida ao longo do tempo (06/11/2026, pedido do Montinho).
// Escolhe o grupo e a medida; linha com os pontos de cada avaliação; tocar num
// ponto mostra a data e o valor. Cor neutra (dourado): quem interpreta é o Montinho.
import { useMemo, useState } from "react";
import { dataBR } from "@/lib/format";
import type { Evolucao } from "@/lib/supabase/types";
import { noPeriodo, resumoSerie, ROTULO_GRUPO_SERIE, seriesDeMedidas, type GrupoSerie } from "@/lib/medidas/series-medidas";

const br = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const un = (u: string) => (u === "%" ? "%" : u ? ` ${u}` : "");
const PERIODOS: Array<[number | null, string]> = [[null, "Tudo"], [365, "1 ano"], [180, "6 meses"]];
const W = 340, H = 180, PX = 30, PY = 22;

export function GraficoMedidas({ medidas }: { medidas: Evolucao[] }) {
  const series = useMemo(() => seriesDeMedidas(medidas), [medidas]);
  const grupos = useMemo(() => [...new Set(series.map((s) => s.grupo))] as GrupoSerie[], [series]);
  const [grupo, setGrupo] = useState<GrupoSerie>(grupos[0] ?? "corpo");
  const doGrupo = series.filter((s) => s.grupo === grupo);
  const [chave, setChave] = useState<string>(doGrupo[0]?.chave ?? "");
  const [periodo, setPeriodo] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  if (!series.length) return null;
  const serie = doGrupo.find((s) => s.chave === chave) ?? doGrupo[0];
  if (!serie) return null;
  const pts = noPeriodo(serie, periodo);
  const r = resumoSerie({ ...serie, pontos: pts.length >= 2 ? pts : serie.pontos });
  const usar = pts.length >= 2 ? pts : serie.pontos;
  const vals = usar.map((p) => p.valor);
  const min = Math.min(...vals), max = Math.max(...vals);
  const folga = (max - min) * 0.15 || Math.max(1, max * 0.05);
  const lo = min - folga, hi = max + folga;
  const t0 = Date.parse(`${usar[0].data}T12:00:00Z`), t1 = Date.parse(`${usar.at(-1)!.data}T12:00:00Z`);
  const x = (d: string) => PX + ((Date.parse(`${d}T12:00:00Z`) - t0) / Math.max(1, t1 - t0)) * (W - PX * 2);
  const y = (v: number) => PY + (1 - (v - lo) / (hi - lo)) * (H - PY * 2);
  const linha = usar.map((p, i) => `${i ? "L" : "M"}${x(p.data).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const ativo = sel != null && usar[sel] ? usar[sel] : null;
  const dif = r.diferenca;

  return (
    <section className="rounded-2xl border border-border bg-card p-4" aria-label="Gráfico de cada medida">
      <h2 className="text-lg font-bold">📈 Cada medida ao longo do tempo</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {grupos.map((g) => (
          <button key={g} type="button" onClick={() => { setGrupo(g); setChave(series.find((s) => s.grupo === g)?.chave ?? ""); setSel(null); }} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${g === grupo ? "border-accent bg-accent text-bg" : "border-border"}`}>{ROTULO_GRUPO_SERIE[g]}</button>
        ))}
      </div>
      <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {doGrupo.map((s) => (
          <button key={s.chave} type="button" onClick={() => { setChave(s.chave); setSel(null); }} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${s.chave === serie.chave ? "border-accent text-accent" : "border-border text-fg-muted"}`}>{s.rotulo}</button>
        ))}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="text-base font-bold">{serie.rotulo}</p>
        <div className="flex gap-1">
          {PERIODOS.map(([d, rot]) => (
            <button key={rot} type="button" onClick={() => { setPeriodo(d); setSel(null); }} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${periodo === d ? "bg-surface text-fg" : "text-fg-subtle"}`}>{rot}</button>
          ))}
        </div>
      </div>
      <p className="text-sm text-fg-muted">
        {dataBR(r.primeiro.data)}: <b className="text-fg">{br(r.primeiro.valor)}{un(serie.unidade)}</b> → {dataBR(r.ultimo.data)}: <b className="text-fg">{br(r.ultimo.valor)}{un(serie.unidade)}</b>
        <span className="ml-1 tabular-nums">({dif === 0 ? "igual" : `${dif > 0 ? "↑ +" : "↓ −"}${br(Math.abs(dif))}${serie.unidade === "%" ? " pontos" : un(serie.unidade)}`})</span>
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`${serie.rotulo}: ${usar.length} registros`}>
        {[max, (max + min) / 2, min].map((v, i) => (
          <g key={i}>
            <line x1={PX} x2={W - PX} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-border" strokeDasharray="3 4" />
            <text x={2} y={y(v) + 3} fontSize="9" className="fill-fg-subtle">{br(Math.round(v * 10) / 10)}</text>
          </g>
        ))}
        <path d={linha} fill="none" stroke="var(--color-accent, #ba9e50)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {usar.map((p, i) => (
          <g key={p.data} onClick={() => setSel(i === sel ? null : i)} className="cursor-pointer">
            <circle cx={x(p.data)} cy={y(p.valor)} r={12} fill="transparent" />
            <circle cx={x(p.data)} cy={y(p.valor)} r={i === sel ? 6 : 4} fill={i === sel ? "var(--color-accent, #ba9e50)" : "var(--color-bg, #0a0a0a)"} stroke="var(--color-accent, #ba9e50)" strokeWidth="2" />
          </g>
        ))}
        <text x={PX} y={H - 4} fontSize="9" className="fill-fg-subtle">{dataBR(usar[0].data)}</text>
        <text x={W - PX} y={H - 4} fontSize="9" textAnchor="end" className="fill-fg-subtle">{dataBR(usar.at(-1)!.data)}</text>
      </svg>
      <p className="mt-1 min-h-5 text-center text-sm">
        {ativo ? <><b>{dataBR(ativo.data)}</b>: {br(ativo.valor)}{un(serie.unidade)}</> : <span className="text-xs text-fg-subtle">Toque num ponto para ver a data e o valor · {usar.length} registros · menor {br(r.menor)} · maior {br(r.maior)}</span>}
      </p>
    </section>
  );
}
