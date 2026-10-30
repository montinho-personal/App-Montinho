"use client";

// Botão do WhatsApp das telas “Minha história” e “Consultoria”. Visitante:
// o toque vai para cta_eventos (painel de leads e CRM, como clique no WhatsApp).
import { eventoGa } from "@/components/analytics/ga";
import { CONTATO, linkContato, type OrigemContato } from "@/lib/montinho/apresentacao";

export function FalarComMontinho({ origem, whatsapp, visitante, texto, compacto = false, onClick }: { origem: OrigemContato; whatsapp: string; visitante: boolean; texto?: string; /** Botão menor (barra fixa embaixo). */ compacto?: boolean; onClick?: () => void }) {
  return (
    <a
      href={linkContato(origem, whatsapp)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        onClick?.();
        eventoGa("montinho_whatsapp_click", { tela: origem });
        if (visitante) void fetch("/api/visitante/cta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cta: origem, tipo: "clicado", tela: origem }), keepalive: true }).catch(() => undefined);
      }}
      className={compacto ? "touch flex shrink-0 items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-bg" : "touch flex w-full items-center justify-center rounded-xl bg-accent px-5 py-4 text-base font-bold text-bg shadow-[0_8px_30px_rgba(186,158,80,0.35)]"}
    >
      {texto ?? CONTATO[origem].botao}
    </a>
  );
}
