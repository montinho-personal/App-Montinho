"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Aceitar ou recusar um convite de desafio. */
export function ResponderConvite({ id }: { id: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function responder(aceitar: boolean) {
    setOcupado(true);
    setErro(null);
    const r = await fetch(`/api/desafios/${id}/responder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aceitar }) }).catch(() => null);
    if (!r?.ok) {
      setErro("Sem conexão. Tente de novo.");
      setOcupado(false);
      return;
    }
    router.refresh();
  }
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button type="button" disabled={ocupado} onClick={() => void responder(true)} className="alvo flex-1 rounded-lg bg-accent px-3 py-2.5 text-sm font-bold text-bg disabled:opacity-60">
          Aceitar o desafio
        </button>
        <button type="button" disabled={ocupado} onClick={() => void responder(false)} className="alvo rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-fg-muted disabled:opacity-60">
          Agora não
        </button>
      </div>
      {erro ? <p role="alert" className="text-xs text-red">{erro}</p> : null}
    </div>
  );
}
