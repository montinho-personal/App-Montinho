"use client";

// Cronômetro da série por tempo (prancha, isometria): conta os segundos, avisa
// ao chegar no tempo prescrito e, ao parar, preenche a duração na série.
import { useEffect, useRef, useState } from "react";
import { formatarSegundos } from "@/lib/treino/medida";

export function CronometroSerie({ alvoSeg, onParar }: { alvoSeg: number | null; onParar: (seg: number) => void }) {
  const [inicio, setInicio] = useState<number | null>(null);
  const [agora, setAgora] = useState(0);
  const avisou = useRef(false);

  useEffect(() => {
    if (inicio == null) return;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [inicio]);

  const seg = inicio == null ? 0 : Math.max(0, Math.floor((agora - inicio) / 1000));
  useEffect(() => {
    if (inicio == null || !alvoSeg || avisou.current || seg < alvoSeg) return;
    avisou.current = true;
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }, [seg, alvoSeg, inicio]);

  if (inicio == null)
    return (
      <button type="button" onClick={() => { avisou.current = false; const t = Date.now(); setInicio(t); setAgora(t); }} className="touch col-span-4 rounded-md border border-accent/60 px-3 py-2 text-xs font-bold text-accent">
        ⏱ Iniciar cronômetro{alvoSeg ? ` · meta ${formatarSegundos(alvoSeg)}` : ""}
      </button>
    );
  const chegou = !!alvoSeg && seg >= alvoSeg;
  return (
    <div role="timer" aria-live="polite" className={`col-span-4 flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${chegou ? "border-success/60 bg-success/10" : "border-accent/60 bg-accent/10"}`}>
      <span className="font-mono text-2xl font-black tabular-nums">{formatarSegundos(seg)}</span>
      <span className="text-xs text-fg-muted">{alvoSeg ? (chegou ? "Meta batida! Segura mais ou pare." : `meta ${formatarSegundos(alvoSeg)}`) : ""}</span>
      <button type="button" onClick={() => { onParar(seg); setInicio(null); }} className="touch rounded-md bg-accent px-3 py-2 text-xs font-bold text-bg">
        Parar
      </button>
    </div>
  );
}
