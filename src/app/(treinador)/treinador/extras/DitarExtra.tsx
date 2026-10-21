"use client";

// Ditar treino extra por voz: o personal fala, o app mostra a prévia
// (lib/treino/ditado-extra) e nada é salvo sem tocar em “Salvar”.
import { useMemo } from "react";
import { useDitado } from "@/components/voz/useDitado";
import { interpretarExtras, type ExtraDitado } from "@/lib/treino/ditado-extra";
import { MODALIDADES } from "@/lib/treino/extra";

export function DitarExtra({ treinos, salvando, onRevisar, onSalvar, onFechar }: { treinos: Array<{ id: string; nome: string }>; salvando: boolean; onRevisar: (x: ExtraDitado) => void; onSalvar: (xs: ExtraDitado[]) => void; onFechar: () => void }) {
  const voz = useDitado();
  const extras = useMemo(() => interpretarExtras(voz.texto, treinos), [voz.texto, treinos]);
  const nomeTreino = (id: string | null) => treinos.find((t) => t.id === id)?.nome ?? null;

  return (
    <div className="space-y-3 rounded-lg border border-accent/50 bg-accent/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">Ditar treino extra</p>
          <p className="text-xs text-fg-muted">Ex.: “cardio leve de 30 minutos na esteira, ritmo de conversa” ou “complementar de glúteo e posterior, 6 séries, 25 minutos”. Para mais de um, diga “e outro”.</p>
        </div>
        <button type="button" onClick={() => { voz.parar(); onFechar(); }} aria-label="Fechar ditado" className="alvo text-fg-muted hover:text-fg">✕</button>
      </div>
      {voz.temMic ? (
        <button type="button" onClick={voz.alternar} aria-pressed={voz.ouvindo} className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${voz.ouvindo ? "animate-pulse bg-danger text-white" : "bg-accent text-bg"}`}>
          {voz.ouvindo ? "● Ouvindo… toque para parar" : "🎤 Toque e fale o extra"}
        </button>
      ) : (
        <p className="text-[11px] text-fg-subtle">Dica: use o microfone do teclado do celular para ditar na caixa abaixo.</p>
      )}
      {voz.erroMic ? <p className="text-xs text-warning">{voz.erroMic}</p> : null}
      <textarea value={voz.texto} onChange={(e) => voz.setTexto(e.target.value)} rows={3} placeholder="O que você falar aparece aqui (dá para corrigir digitando)." aria-label="Texto ditado" className="w-full rounded-md border border-border bg-bg p-2 text-sm" />

      {extras.length ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">Prévia ({extras.length})</p>
          {extras.map((x, i) => (
            <div key={i} className="space-y-1 rounded-lg border border-border bg-card p-2.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{x.titulo}</p>
                <button type="button" onClick={() => { voz.parar(); onRevisar(x); }} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
                  Revisar no formulário
                </button>
              </div>
              <p className="text-xs text-fg-muted">
                {MODALIDADES[x.modalidade].rotulo} · {x.duracao_min} min
                {x.series_estimadas ? ` · ${x.series_estimadas} séries` : ""}
                {x.grupos.length ? ` · ${x.grupos.map((g) => g.replace(/_/g, " ")).join(", ")}` : ""}
                {nomeTreino(x.treino_id) ? ` · usa o treino ${nomeTreino(x.treino_id)}` : ""}
              </p>
              <p className="text-xs text-fg-subtle">Orientação: {x.descricao}</p>
              {x.avisos.map((a) => (
                <p key={a} className="text-xs text-warning">⚠ {a}</p>
              ))}
            </div>
          ))}
          <button type="button" disabled={salvando} onClick={() => { voz.parar(); onSalvar(extras); }} className="touch w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-bg disabled:opacity-60">
            {extras.length > 1 ? `Salvar os ${extras.length} extras` : "Salvar extra"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
