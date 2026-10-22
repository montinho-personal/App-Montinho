"use client";

import { useEffect, useRef, useState } from "react";
import { registrarCliqueGa } from "@/components/analytics/ga";
import { prazoRestante, type Oferta } from "@/lib/visitante/campanhas";

const enviar = (id: string, tipo: "exibido" | "clicado", tela: string) =>
  fetch("/api/visitante/cta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cta: id, tipo, tela }), keepalive: true }).catch(() => undefined);

/** Oferta do fim do acesso (20% / conversa / o que atrapalhou), em destaque. Registra exibido/clicado (o 1º “exibido” marca o início das 72 h). */
export function OfertaVisitante({ oferta, href, tela }: { oferta: Oferta; href: string; tela: "inicio" | "fim_treino" }) {
  const registrado = useRef(false);
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    if (!registrado.current) {
      registrado.current = true;
      void enviar(oferta.id, "exibido", tela);
    }
    // Relógio do prazo (no navegador, para não divergir do servidor).
    const t0 = window.setTimeout(() => setAgora(new Date()), 0);
    const id = window.setInterval(() => setAgora(new Date()), 60_000);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, [oferta.id, tela]);
  const desconto = oferta.id === "oferta_desconto";
  return (
    <section aria-label="Oferta" className={`rounded-2xl p-5 ${desconto ? "border-2 border-accent bg-[linear-gradient(160deg,#3a3016_0%,#171717_75%)]" : "border border-accent/50 bg-card"}`}>
      {desconto ? <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Oferta exclusiva para você</p> : null}
      <h2 className={`mt-1 font-black leading-tight ${desconto ? "text-2xl" : "text-xl"}`}>{oferta.titulo}</h2>
      <p className="mt-2 text-sm text-fg-muted">{oferta.texto}</p>
      {oferta.expiraEm && agora ? <p className="mt-3 text-sm font-bold text-accent">⏳ Válido por 72 h · {prazoRestante(oferta.expiraEm, agora)}</p> : null}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          void enviar(oferta.id, "clicado", tela);
          registrarCliqueGa(oferta.ref, tela);
        }}
        className="alvo mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg"
      >
        {oferta.botao}
      </a>
    </section>
  );
}
