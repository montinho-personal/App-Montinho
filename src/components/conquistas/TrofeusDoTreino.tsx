"use client";
// Ao tocar em “Começar treino”: quantos troféus dá para ganhar neste treino e
// o que fazer em cada um (ao-alcance.ts). Fecha no botão ou tocando fora.
import type { ItemAlcance } from "@/lib/conquistas/ao-alcance";
import { Button } from "@/components/ui/Button";

export function TrofeusDoTreino({ itens, onFechar }: { itens: ItemAlcance[]; onFechar: () => void }) {
  const n = itens.length;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="trofeus-treino-titulo" className="fixed inset-0 z-[85] flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={onFechar}>
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-accent/60 bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <p className="text-4xl" aria-hidden>🏆</p>
          <h2 id="trofeus-treino-titulo" className="mt-1 text-lg font-bold">
            Neste treino você pode ganhar <span className="text-accent">{n} {n === 1 ? "troféu" : "troféus"}</span>!
          </h2>
        </div>
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {itens.map((i) => (
            <li key={i.codigo} className="flex items-start gap-3 rounded-lg border border-border bg-bg/40 px-3 py-2">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-accent/60 bg-bg font-mono text-[10px] font-bold text-accent" aria-hidden>
                {i.selo}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{i.titulo}</span>
                <span className="block text-xs text-fg-muted">{i.oQueFazer}</span>
              </span>
            </li>
          ))}
        </ul>
        <Button variant="gold" size="lg" className="w-full touch" onClick={onFechar} autoFocus>
          Bora buscar!
        </Button>
      </div>
    </div>
  );
}
