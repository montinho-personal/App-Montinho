"use client";
// Aviso discreto depois da série: curto, verdadeiro e fácil de dispensar.
// Não bloqueia nada (não é modal) e some sozinho; o descanso continua correndo.
import { useEffect, useState } from "react";
import { POR_QUE, type Descoberta } from "@/lib/evolucao/motor";

export function AvisoEvolucao({ d, chalala, animar = true, onFechar, sugestao }: { d: Descoberta; chalala?: string | null; animar?: boolean; onFechar: () => void; sugestao?: { chamada: string; onAbrir: () => void } | null }) {
  const [porQue, setPorQue] = useState(false);
  useEffect(() => {
    if (porQue) return; // lendo a explicação: não some
    const t = setTimeout(onFechar, 12000);
    return () => clearTimeout(t);
  }, [porQue, onFechar]);
  return (
    <div role="status" aria-live="polite" className={`fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-50 mx-auto max-w-md rounded-xl border border-accent/60 bg-card/95 p-3 shadow-2xl backdrop-blur ${animar ? "motion-safe:animate-[jornadaSobe_220ms_ease-out]" : ""}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-lg leading-none" aria-hidden>{d.tipo.startsWith("recorde") ? "🏅" : "📈"}</span>
        <div className="min-w-0 flex-1">
          {/* Chalalá: a frase do Montinho no lugar do título; o fato (números) continua embaixo. */}
          {chalala ? <p className="text-sm font-black leading-snug text-accent">{chalala}</p> : <p className="text-[11px] font-black uppercase tracking-wider text-accent">{d.titulo}</p>}
          <p className="text-sm leading-snug">{d.mensagem}</p>
          <button type="button" onClick={() => setPorQue((v) => !v)} className="alvo mt-0.5 text-xs font-semibold text-fg-muted underline-offset-2 hover:underline">Por que isso é importante?</button>
          {porQue ? <p className="mt-1 text-xs text-fg-muted">{POR_QUE[d.tipo]}</p> : null}
          {sugestao ? (
            <button type="button" onClick={sugestao.onAbrir} className="alvo mt-1 block text-left text-xs font-semibold text-accent underline-offset-2 hover:underline">
              {sugestao.chamada} →
            </button>
          ) : null}
        </div>
        <button type="button" onClick={onFechar} aria-label="Dispensar aviso" className="alvo -mr-1 -mt-1 text-fg-muted hover:text-fg">✕</button>
      </div>
    </div>
  );
}
