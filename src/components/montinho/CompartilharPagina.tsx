"use client";

// Compartilhar “Minha história” e “Consultoria” (pedido do Montinho, 29/10/2026):
// manda o link público do site (abre sem login); sem o menu do celular, abre o WhatsApp.
import { useState } from "react";
import { eventoGa } from "@/components/analytics/ga";
import { COMPARTILHAR, type OrigemContato } from "@/lib/montinho/apresentacao";

export function CompartilharPagina({ origem, destaque = false }: { origem: OrigemContato; destaque?: boolean }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const c = COMPARTILHAR[origem];
  async function compartilhar() {
    eventoGa("montinho_compartilhar", { tela: origem });
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: c.titulo, text: c.texto, url: c.url });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${c.texto} ${c.url}`)}`, "_blank", "noopener");
    setAviso("Abrimos o WhatsApp com o link pronto.");
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void compartilhar()}
        className={destaque ? "touch flex w-full items-center justify-center gap-2 rounded-xl border-2 border-accent px-5 py-3 font-bold text-accent" : "touch inline-flex items-center gap-2 rounded-full border border-accent/60 px-4 text-sm font-semibold text-accent"}
      >
        📲 Compartilhar
      </button>
      {aviso ? <p role="status" className="text-center text-xs text-fg-muted">{aviso}</p> : null}
    </div>
  );
}
