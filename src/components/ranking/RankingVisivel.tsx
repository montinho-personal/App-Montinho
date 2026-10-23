"use client";

// Perfil: aparecer (ou não) no ranking de troféus para os outros alunos.
import { useState } from "react";

export function RankingVisivel({ inicial }: { inicial: boolean }) {
  const [ligado, setLigado] = useState(inicial);
  const [aviso, setAviso] = useState<string | null>(null);
  async function mudar(v: boolean) {
    setLigado(v);
    const r = await fetch("/api/ranking", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visivel: v }) }).catch(() => null);
    if (!r?.ok) {
      setLigado(!v);
      setAviso("Não deu para salvar agora. Tente de novo.");
    } else setAviso(v ? "Você aparece no ranking." : "Pronto: os outros não veem você no ranking.");
  }
  return (
    <section className="space-y-2 rounded-xl border border-border bg-surface p-4">
      <label className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-base font-bold">🏆 Aparecer no ranking</span>
          <span className="block text-xs text-fg-muted">Mostra seu primeiro nome, a inicial do sobrenome e quantos troféus você tem para os outros alunos.</span>
        </span>
        <input type="checkbox" role="switch" checked={ligado} onChange={(e) => void mudar(e.target.checked)} className="mt-1 h-5 w-9 shrink-0 accent-[var(--color-accent)]" />
      </label>
      {aviso ? <p role="status" className="text-xs text-fg-subtle">{aviso}</p> : null}
    </section>
  );
}
