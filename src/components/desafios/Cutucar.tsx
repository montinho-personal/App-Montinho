"use client";

import { useState } from "react";

const EMOJIS = ["🔥", "💪", "😈", "⏰", "👀"] as const;

/** Cutucar quem está no mesmo desafio (1 por dia para a mesma pessoa). */
export function Cutucar({ desafioId, para, nome }: { desafioId: string; para: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  async function enviar(emoji: string) {
    setAberto(false);
    const r = await fetch(`/api/desafios/${desafioId}/cutucar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ para, emoji }) }).catch(() => null);
    const j = ((await r?.json().catch(() => ({}))) ?? {}) as { mensagem?: string; error?: string };
    setAviso(r?.ok ? (j.mensagem ?? "Enviado!") : (j.error ?? "Sem conexão."));
  }
  if (aviso) return <span role="status" className="text-[11px] text-fg-muted">{aviso}</span>;
  return aberto ? (
    <span className="flex gap-1" role="group" aria-label={`Cutucar ${nome}`}>
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => void enviar(e)} className="alvo grid h-9 w-9 place-items-center rounded-full border border-border text-lg hover:border-accent" aria-label={`Mandar ${e}`}>
          {e}
        </button>
      ))}
    </span>
  ) : (
    <button type="button" onClick={() => setAberto(true)} className="alvo rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-fg-muted hover:border-accent hover:text-fg" aria-label={`Cutucar ${nome}`}>
      🔥 Cutucar
    </button>
  );
}
