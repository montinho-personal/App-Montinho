"use client";
// Faixa discreta de microvitória no treino (some sozinha em 3,5 s; sem janela).
import { useEffect } from "react";

export function MicroVitoriaFaixa({ texto, onSumir }: { texto: string; onSumir: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onSumir, 3500);
    return () => window.clearTimeout(t);
  }, [texto, onSumir]);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-safe z-40 flex justify-center px-4 pt-2">
      <p className="chalala-pop rounded-full border border-success/50 bg-bg/95 px-4 py-2 text-sm font-bold text-success shadow-lg backdrop-blur motion-reduce:animate-none">{texto}</p>
    </div>
  );
}
