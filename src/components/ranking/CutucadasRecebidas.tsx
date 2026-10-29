"use client";

// Cutucadas recebidas no Ranking (0117): mostra quem cutucou, com o recado,
// e “cutucar de volta”. Ao aparecer, marca como vistas.
import { useEffect, useState } from "react";
import { textoDaCutucada } from "@/lib/ranking/perfil";
import type { CutucadaRanking } from "@/lib/data/ranking";

export function CutucadasRecebidas({ cutucadas }: { cutucadas: CutucadaRanking[] }) {
  const [devolvidas, setDevolvidas] = useState<Record<string, string>>({});
  useEffect(() => {
    if (cutucadas.length) fetch("/api/ranking/cutucadas", { method: "POST" }).catch(() => undefined);
  }, [cutucadas.length]);
  if (!cutucadas.length) return null;

  async function devolver(c: CutucadaRanking) {
    const r = await fetch("/api/ranking/cutucar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: c.de_ref, emoji: "🔥" }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { ok?: boolean };
    setDevolvidas((d) => ({ ...d, [c.id]: j.ok ? "🔥 Cutucada devolvida!" : "Você já cutucou hoje." }));
  }

  return (
    <section className="space-y-2" aria-label="Cutucadas recebidas">
      {cutucadas.map((c) => (
        <div key={c.id} className="flex items-center gap-3 rounded-xl border border-accent/50 bg-accent/10 px-3 py-2.5">
          <span className="text-2xl" aria-hidden>{c.emoji}</span>
          <span className="min-w-0 flex-1 text-sm">
            <b>{c.de}</b> te cutucou: “{textoDaCutucada(c.emoji)}”
          </span>
          {devolvidas[c.id] ? (
            <span className="shrink-0 text-xs font-semibold text-success">{devolvidas[c.id]}</span>
          ) : (
            <button type="button" onClick={() => void devolver(c)} className="alvo shrink-0 rounded-full border border-accent/60 px-2.5 py-1 text-xs font-bold text-accent">🔥 De volta</button>
          )}
        </div>
      ))}
    </section>
  );
}
