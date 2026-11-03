"use client";

import { useEffect, useState } from "react";

/** Descanso também dentro do cartão do exercício (iPhone: o flutuante às vezes fica fora da tela). */
export function DescansoNoCartao({ fim, pausadoSeg, onPular }: { fim: number; pausadoSeg?: number; onPular: () => void }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const resta = pausadoSeg ?? Math.max(0, Math.ceil((fim - agora) / 1000));
  if (!resta) return null;
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5">
      <span className="text-sm font-bold">⏱ Descanso: <span className="font-mono tabular-nums text-accent">{Math.floor(resta / 60)}:{String(resta % 60).padStart(2, "0")}</span>{pausadoSeg != null ? <span className="text-xs font-semibold text-fg-muted"> · pausado</span> : null}</span>
      <button type="button" onClick={onPular} className="alvo rounded-md px-2 text-xs font-semibold text-fg-muted underline-offset-2 hover:underline">Pular descanso</button>
    </div>
  );
}
