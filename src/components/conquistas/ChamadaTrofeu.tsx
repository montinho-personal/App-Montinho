"use client";
// Chamada no lugar da ação (pedido do Montinho, 28/10/2026): “compartilhe
// agora e ganhe o troféu …”. Busca no servidor qual troféu esta ação dá
// (ao-alcance.ts#chamadaDaAcao); sem nada a ganhar, não aparece.
import { useEffect, useState } from "react";
import type { AcaoTrofeu, ChamadaTrofeu as Chamada } from "@/lib/conquistas/ao-alcance";

export function ChamadaTrofeu({ acao, refTrofeu, className = "" }: { acao: AcaoTrofeu; refTrofeu?: string | null; className?: string }) {
  const [c, setC] = useState<Chamada | null>(null);
  useEffect(() => {
    let vivo = true;
    const q = new URLSearchParams({ acao, ...(refTrofeu ? { ref: refTrofeu } : {}) });
    fetch(`/api/conquistas/chamada?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { chamada?: Chamada | null } | null) => {
        if (vivo) setC(j?.chamada ?? null);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [acao, refTrofeu]);
  if (!c) return null;
  return (
    <p role="status" className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs ${c.agora ? "border-accent/70 bg-accent/15 text-fg" : "border-border bg-surface text-fg-muted"} ${className}`}>
      <span aria-hidden className="text-base leading-none">{c.agora ? "🏆" : "🎯"}</span>
      <span>
        {c.texto} <strong className="text-accent">“{c.titulo}”</strong>
        {c.agora ? "!" : "."}
      </span>
    </p>
  );
}
