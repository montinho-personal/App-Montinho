"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EntrarDesafio({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function entrar() {
    setOcupado(true);
    setErro(null);
    const r = await fetch("/api/desafios/entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo }) }).catch(() => null);
    const j = ((await r?.json().catch(() => ({}))) ?? {}) as { id?: string; error?: string };
    if (!r?.ok || !j.id) {
      setErro(j.error ?? "Sem conexão. Tente de novo.");
      setOcupado(false);
      return;
    }
    router.push(`/aluno/desafios/${j.id}`);
  }
  return (
    <div className="space-y-2">
      <button type="button" disabled={ocupado} onClick={() => void entrar()} className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg disabled:opacity-60">
        {ocupado ? "Entrando…" : "⚔️ Topo! Entrar no desafio"}
      </button>
      {erro ? <p role="alert" className="text-sm text-red">{erro}</p> : null}
    </div>
  );
}
