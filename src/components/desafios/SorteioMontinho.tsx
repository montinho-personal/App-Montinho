"use client";

// Modo sorteio (pedido do Montinho, 24/10/2026): o Montinho, guia da Jornada,
// sorteia um dos desafios prontos e a pessoa aceita o que cair (ou sorteia de novo).
import { useEffect, useRef, useState } from "react";
import { Montinho } from "@/components/jornada-chalala/Personagens";
import { DESAFIOS_PRONTOS, type DesafioPronto } from "@/lib/desafios/regras";

// O “Mesmo treino” pede escolher os exercícios: fica fora do sorteio.
const SORTEAVEIS = DESAFIOS_PRONTOS.filter((p) => p.tipo !== "treino_desafio");

export function SorteioMontinho({ onAceitar }: { onAceitar: (p: DesafioPronto) => void }) {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState<DesafioPronto | null>(null);
  const [girando, setGirando] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function sortear() {
    setAberto(true);
    setGirando(true);
    const final = SORTEAVEIS[Math.floor(Math.random() * SORTEAVEIS.length)];
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let passo = 0;
    const total = reduzido ? 1 : 16;
    const girar = () => {
      passo++;
      if (passo >= total) {
        setAtual(final);
        setGirando(false);
        return;
      }
      setAtual(SORTEAVEIS[Math.floor(Math.random() * SORTEAVEIS.length)]);
      timer.current = window.setTimeout(girar, 60 + passo * 18);
    };
    girar();
  }

  return (
    <>
      <button type="button" onClick={sortear} className="alvo flex w-full items-center gap-3 rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#3a3016_0%,#171717_75%)] px-4 py-3 text-left">
        <Montinho tamanho={56} />
        <span className="flex-1">
          <span className="block font-black">🎲 O Montinho sorteia!</span>
          <span className="block text-xs text-fg-muted">Não sabe qual escolher? Deixa o Mestre decidir. O que cair, vale.</span>
        </span>
      </button>
      {aberto ? (
        <div role="dialog" aria-modal="true" aria-label="Sorteio do Montinho" className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center" onClick={() => !girando && setAberto(false)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#3a3016_0%,#171717_70%)] p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className={`mx-auto w-fit ${girando ? "motion-safe:animate-bounce" : ""}`}>
              <Montinho tamanho={96} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-accent">{girando ? "O Montinho está sorteando…" : "O Montinho decidiu!"}</p>
            {atual ? (
              <div aria-live="polite" className={`rounded-xl border border-border bg-bg/60 p-4 ${girando ? "opacity-70" : ""}`}>
                <p className="text-4xl" aria-hidden>{atual.emoji}</p>
                <p className="mt-1 text-xl font-black">{atual.nome}</p>
                {!girando ? <p className="mt-1 text-sm text-fg-muted">{atual.chamada}</p> : null}
              </div>
            ) : null}
            {!girando && atual ? (
              <div className="space-y-2">
                <button type="button" onClick={() => { setAberto(false); onAceitar(atual); }} className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg">
                  ⚔️ Vale esse!
                </button>
                <button type="button" onClick={sortear} className="alvo w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
                  🎲 Sortear de novo
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
