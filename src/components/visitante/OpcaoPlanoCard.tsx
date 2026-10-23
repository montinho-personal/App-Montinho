"use client";

// Uma opção de plano (Monte com IA ou treino pronto): treinos A, B, C… com os
// exercícios, tempo estimado e séries por músculo na semana.
import { useState } from "react";
import { GRUPO_LABEL } from "@/lib/grupos";
import type { OpcaoVista } from "@/lib/data/plano-visitante";

export function OpcaoPlanoCard({ opcao, titulo, acao, destaque = false }: { opcao: OpcaoVista; titulo?: string; acao?: React.ReactNode; destaque?: boolean }) {
  const [aberto, setAberto] = useState<string | null>(opcao.treinos[0]?.letra ?? null);
  return (
    <article className={`space-y-3 rounded-2xl border p-4 ${destaque ? "border-accent/60 bg-accent/5" : "border-border bg-card"}`}>
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{titulo ?? `Opção ${opcao.id}`}</p>
        <h3 className="text-lg font-bold leading-tight">{opcao.titulo}</h3>
        <p className="text-xs text-fg-muted">{opcao.treinos.length} treinos por semana · cerca de {Math.max(...opcao.treinos.map((t) => t.minutos))} min cada</p>
      </header>
      <ul className="space-y-2">
        {opcao.treinos.map((t) => (
          <li key={t.letra} className="rounded-xl border border-border bg-bg/40">
            <button type="button" onClick={() => setAberto(aberto === t.letra ? null : t.letra)} aria-expanded={aberto === t.letra} className="alvo flex w-full items-center gap-3 px-3 py-2.5 text-left">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-sm font-black text-accent">{t.letra}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t.nome}</span>
                <span className="block text-[11px] text-fg-subtle">{t.exercicios.length} exercícios · ~{t.minutos} min</span>
              </span>
              <span aria-hidden className="text-fg-subtle">{aberto === t.letra ? "−" : "+"}</span>
            </button>
            {aberto === t.letra ? (
              <ol className="space-y-1 border-t border-border px-3 py-2 text-sm">
                {t.exercicios.map((e, i) => (
                  <li key={`${e.slug}-${i}`} className="flex justify-between gap-2">
                    <span className="min-w-0">{i + 1}. {e.nome}{e.video ? <span className="ml-1 text-[10px] text-fg-subtle">▶ vídeo</span> : null}</span>
                    <span className="shrink-0 font-mono text-xs text-fg-muted">{e.series}×{e.reps}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </ul>
      <details className="text-xs text-fg-muted">
        <summary className="cursor-pointer font-semibold">Séries por músculo na semana e dicas</summary>
        <p className="mt-2">{opcao.seriesPorGrupo.map((g) => `${GRUPO_LABEL[g.grupo] ?? g.grupo} ${g.series}`).join(" · ")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {opcao.dicas.map((d) => <li key={d}>{d}</li>)}
        </ul>
      </details>
      {acao}
    </article>
  );
}
