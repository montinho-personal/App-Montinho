"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { registrarCliqueGa } from "@/components/analytics/ga";

type Props = { id: string; tela: string; refCodigo: string; titulo: string; texto: string; botao: string; href: string; dispensavel: boolean; destaque?: boolean };

const enviar = (id: string, tipo: "exibido" | "clicado" | "dispensado", tela: string) =>
  fetch("/api/visitante/cta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cta: id, tipo, tela }), keepalive: true }).catch(() => undefined);

/** Convite para falar com o Montinho no WhatsApp (registra exibido/clicado/dispensado). */
export function CtaCard({ id, tela, refCodigo, titulo, texto, botao, href, dispensavel, destaque }: Props) {
  const [fechado, setFechado] = useState(false);
  const registrado = useRef(false);
  useEffect(() => {
    if (registrado.current) return;
    registrado.current = true;
    void enviar(id, "exibido", tela);
  }, [id, tela]);
  if (fechado) return null;
  return (
    <div role="status" className={`relative rounded-xl border px-4 py-3 text-sm ${destaque ? "border-accent bg-accent-soft" : "border-accent/40 bg-card"}`}>
      {dispensavel ? (
        <button
          type="button"
          aria-label="Dispensar"
          onClick={() => {
            setFechado(true);
            void enviar(id, "dispensado", tela);
          }}
          className="alvo absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-fg-subtle hover:text-fg"
        >
          <Icon name="x" size={16} />
        </button>
      ) : null}
      <p className="pr-8 font-semibold">{titulo}</p>
      <p className="mt-1 text-fg-muted">{texto}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          void enviar(id, "clicado", tela);
          registrarCliqueGa(refCodigo, tela);
        }}
        className="alvo mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 font-semibold text-bg"
      >
        {botao}
      </a>
    </div>
  );
}
