"use client";

// Barra que sobe de baixo com o botão do WhatsApp (pedido do Montinho, 30/10/2026:
// “dá vontade de comprar e não tem o botão”). Aparece depois de rolar um pouco e
// some perto do fim da página, onde já tem o botão grande.
import { useEffect, useState } from "react";
import { FalarComMontinho } from "./FalarComMontinho";
import type { OrigemContato } from "@/lib/montinho/apresentacao";

export function BarraFixaCta({ origem, whatsapp, visitante, texto, detalhe, botao }: { origem: OrigemContato; whatsapp: string; visitante: boolean; texto: string; detalhe?: string; botao: string }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const ver = () => {
      const fim = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      setVisivel(window.scrollY > 350 && fim > 260);
    };
    ver();
    window.addEventListener("scroll", ver, { passive: true });
    window.addEventListener("resize", ver);
    return () => {
      window.removeEventListener("scroll", ver);
      window.removeEventListener("resize", ver);
    };
  }, []);
  return (
    <div
      aria-hidden={!visivel}
      className={`fixed inset-x-3 z-40 mx-auto max-w-md transition-all duration-300 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 ${visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-accent/50 bg-[#171410]/95 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{texto}</p>
          {detalhe ? <p className="truncate text-[11px] text-fg-muted">{detalhe}</p> : null}
        </div>
        <FalarComMontinho origem={origem} whatsapp={whatsapp} visitante={visitante} texto={botao} compacto />
      </div>
    </div>
  );
}
