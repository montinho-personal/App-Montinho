"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ComecarLivre() {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function comecar() {
    setOcupado(true);
    setErro(null);
    const r = await fetch("/api/livre", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_key: `livre-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` }) }).catch(() => null);
    const j = ((await r?.json().catch(() => ({}))) ?? {}) as { id?: string; error?: string };
    if (r?.ok && j.id) return router.push(`/aluno/livre/${j.id}`);
    setErro(j.error ?? "Sem conexão. Confira a internet e tente de novo.");
    setOcupado(false);
  }
  return (
    <div className="space-y-2">
      <Button variant="gold" size="lg" className="w-full" loading={ocupado} onClick={() => void comecar()}>🎲 Começar treino livre</Button>
      {erro ? <p role="alert" className="text-sm text-red">{erro}</p> : null}
    </div>
  );
}
