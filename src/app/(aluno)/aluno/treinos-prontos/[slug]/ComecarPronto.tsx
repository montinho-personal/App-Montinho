"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ComecarPronto({ slug, temTreinos }: { slug: string; temTreinos: boolean }) {
  const [substituir, setSubstituir] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function comecar() {
    setErro(null);
    setEnviando(true);
    const r = await fetch("/api/visitante/plano", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origem: { tipo: "pronto", slug }, substituir: temTreinos ? substituir : false }) }).catch(() => null);
    if (r?.ok) return window.location.assign("/aluno/meus-treinos?novo=1");
    setEnviando(false);
    setErro(((await r?.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível começar agora.");
  }
  return (
    <div className="space-y-3">
      {temTreinos ? (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} className="mt-1 h-4 w-4" />
          <span>Trocar meus treinos atuais por este <span className="block text-xs text-fg-subtle">Os atuais saem da lista, mas o histórico continua salvo.</span></span>
        </label>
      ) : null}
      {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
      <Button type="button" className="w-full" disabled={enviando} onClick={() => void comecar()}>{enviando ? "Preparando…" : "🔥 Começar este treino"}</Button>
      <p className="text-center text-xs text-fg-subtle">Depois dá para trocar exercícios, séries e repetições em Meus treinos.</p>
    </div>
  );
}
