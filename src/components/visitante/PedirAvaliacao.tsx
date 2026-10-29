"use client";

// Pedido de avaliação no Google (0112). Regras em src/lib/visitante/avaliacao.ts:
// o mesmo botão para todo mundo (sem “gostou?” antes), sem prêmio por avaliar,
// e a sugestão no WhatsApp ao lado (nunca no lugar do Google).
import { useEffect, useRef, useState } from "react";
import { eventoGa } from "@/components/analytics/ga";
import { linkSugestao, TEXTOS_AVALIACAO } from "@/lib/visitante/avaliacao";

type Acao = "exibido" | "google" | "feita" | "depois" | "sugestao";

function enviar(acao: Acao, tela: "fim_treino" | "avaliar") {
  void fetch("/api/visitante/avaliacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, tela }), keepalive: true }).catch(() => undefined);
}

export function PedirAvaliacao({ link, treinos, whatsapp, tela }: { link: string; treinos: number; whatsapp: string | null; tela: "fim_treino" | "avaliar" }) {
  const [estado, setEstado] = useState<"pedido" | "obrigado" | "fechado">("pedido");
  const contou = useRef(false);
  useEffect(() => {
    if (contou.current) return;
    contou.current = true;
    enviar("exibido", tela);
    eventoGa("avaliacao_google_visto", { tela });
  }, [tela]);

  if (estado === "fechado") return null;
  if (estado === "obrigado") {
    return (
      <section aria-live="polite" className="rounded-2xl border border-accent/50 bg-accent/10 p-4 text-center text-sm font-semibold">
        {TEXTOS_AVALIACAO.obrigado}
      </section>
    );
  }
  return (
    <section aria-label="Avaliar no Google" className="space-y-3 rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#2a2415_0%,#171717_70%)] p-5">
      <p aria-hidden className="text-2xl tracking-[0.2em] text-[#f5c451]">★★★★★</p>
      <h2 className="text-lg font-bold leading-tight">{TEXTOS_AVALIACAO.titulo}</h2>
      <p className="text-sm text-fg-muted">{TEXTOS_AVALIACAO.texto(treinos)}</p>
      <p className="text-xs text-fg-subtle">{TEXTOS_AVALIACAO.dica}</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          enviar("google", tela);
          eventoGa("avaliacao_google_clicado", { tela });
          setTimeout(() => setEstado("obrigado"), 400);
        }}
        className="touch flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-base font-bold text-bg"
      >
        {TEXTOS_AVALIACAO.botao}
      </a>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            enviar("depois", tela);
            setEstado("fechado");
          }}
          className="touch rounded-xl border border-border px-3 py-2 text-sm font-semibold text-fg-muted"
        >
          {TEXTOS_AVALIACAO.depois}
        </button>
        <button
          type="button"
          onClick={() => {
            enviar("feita", tela);
            setEstado("obrigado");
          }}
          className="touch rounded-xl border border-border px-3 py-2 text-sm font-semibold text-fg-muted"
        >
          {TEXTOS_AVALIACAO.feita}
        </button>
      </div>
      {whatsapp ? (
        <a href={linkSugestao(whatsapp)} target="_blank" rel="noopener noreferrer" onClick={() => enviar("sugestao", tela)} className="block text-center text-xs text-fg-muted underline underline-offset-2">
          {TEXTOS_AVALIACAO.sugestao}
        </a>
      ) : null}
    </section>
  );
}
