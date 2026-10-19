"use client";

import { useState } from "react";
import type { CheckIn } from "@/lib/supabase/types-extended";
import { SimpleLine } from "@/components/ui/SimpleChart";
import { dataBR } from "@/lib/format";

type MetricaKey = "energia" | "sono" | "motivacao" | "dor" | "estresse";

const METRICAS: { key: MetricaKey; label: string; emoji: string; bom: "alto" | "baixo" }[] = [
  { key: "energia", label: "Energia", emoji: "⚡", bom: "alto" },
  { key: "sono", label: "Sono", emoji: "😴", bom: "alto" },
  { key: "motivacao", label: "Motivação", emoji: "🔥", bom: "alto" },
  { key: "dor", label: "Dor", emoji: "🩹", bom: "baixo" },
  { key: "estresse", label: "Estresse", emoji: "😰", bom: "baixo" },
];

export function PainelCheckins({ checkIns, dias = 30 }: { checkIns: CheckIn[]; dias?: number }) {
  const [periodo, setPeriodo] = useState(dias);
  if (checkIns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
        <div className="text-3xl mb-2 opacity-50">📅</div>
        <div className="font-bold text-sm">Nenhum check-in ainda</div>
        <div className="text-xs text-fg-muted mt-1">
          Quando o aluno responder o check-in diário (energia, sono, dor, motivação, estresse), os
          gráficos aparecem aqui.
        </div>
      </div>
    );
  }

  // Filtra pelo período selecionado (7/30/90 dias).
  const limite = new Date();
  limite.setDate(limite.getDate() - periodo);
  const ordenados = [...checkIns]
    .filter((c) => new Date(c.data) >= limite)
    .sort((a, b) => (a.data < b.data ? -1 : 1));
  const adesao = Math.round((ordenados.length / periodo) * 100);
  const comNota = ordenados.filter((c) => c.notas?.trim()).slice(-4).reverse();

  return (
    <div className="space-y-4">
      {/* Cabeçalho de adesão + filtro de período */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
            Check-ins
          </div>
          <div className="text-sm mt-0.5">
            <b className="text-accent">{ordenados.length}</b> registros nos últimos {periodo} dias
          </div>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-bg p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriodo(d)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                periodo === d ? "bg-accent text-white" : "text-fg-muted hover:text-fg"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
            Adesão
          </div>
          <div className={`text-lg font-bold mt-0.5 ${adesao >= 70 ? "text-success" : adesao >= 40 ? "text-gold" : "text-red"}`}>
            {adesao}%
          </div>
        </div>
      </div>

      {/* Métricas com sparkline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {METRICAS.map((m) => {
          const serie = ordenados.map((c) => c[m.key] ?? 0);
          const validos = serie.filter((v) => v > 0);
          const atual = validos[validos.length - 1] ?? 0;
          const media = validos.length
            ? validos.reduce((a, b) => a + b, 0) / validos.length
            : 0;
          // Cor: métrica "boa alta" verde se alta; "boa baixa" verde se baixa.
          const positivo = m.bom === "alto" ? atual >= 7 : atual <= 3;
          const tone = positivo ? "success" : m.bom === "baixo" ? "gold" : "accent";
          return (
            <div key={m.key} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12.5px] font-semibold inline-flex items-center gap-1.5">
                  <span>{m.emoji}</span>
                  {m.label}
                </span>
                <span className="text-[12px] text-fg-muted">
                  <b className="text-fg text-sm">{atual}</b>
                  <span className="text-fg-subtle">/10 · méd {media.toFixed(1)}</span>
                </span>
              </div>
              {serie.length >= 2 ? (
                <SimpleLine data={serie} width={300} height={42} tone={tone} className="w-full" />
              ) : (
                <div className="h-[42px] flex items-center text-[11px] text-fg-subtle">
                  poucos dados pra gráfico
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notas recentes */}
      {comNota.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-[11px] uppercase tracking-wider font-bold text-fg-subtle">
            Anotações recentes do aluno
          </div>
          <ul className="divide-y divide-border">
            {comNota.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="text-[11px] text-fg-subtle mb-0.5">{dataBR(c.data)}</div>
                <div className="text-[13px] text-fg italic">“{c.notas}”</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
