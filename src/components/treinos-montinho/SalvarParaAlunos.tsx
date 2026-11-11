"use client";

// No fim do treino do personal (Meu treino): “💾 Salvar para os alunos” (Treinos do Montinho, 0154).
import { useState } from "react";

export function SalvarParaAlunos({ sessaoId, titulo }: { sessaoId: string; titulo: string }) {
  const [estado, setEstado] = useState<"livre" | "salvando" | "ok" | string>("livre");
  async function salvar() {
    setEstado("salvando");
    const r = await fetch("/api/treinador/treinos-montinho", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessao_id: sessaoId }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setEstado(r?.ok ? "ok" : j.error ?? "Não deu para salvar agora.");
  }
  return (
    <section className="space-y-2 rounded-2xl border-2 border-accent/50 bg-accent/10 p-4">
      <p className="font-black">🔥 Mostrar “{titulo}” aos alunos?</p>
      <p className="text-xs text-fg-muted">Ele aparece em Treinar › “Treinos que o Montinho fez”, com um texto pronto sobre o foco do treino. As suas cargas não vão junto.</p>
      {estado === "ok" ? (
        <p className="text-sm font-semibold">✅ Salvo! Para mudar o texto: <a className="text-accent underline" href="/api/meu-treino?sair=1&para=/treinador/treinos-montinho">Treinos do Montinho</a></p>
      ) : (
        <button type="button" disabled={estado === "salvando"} onClick={() => void salvar()} className="touch w-full rounded-xl bg-accent px-3 py-2.5 font-black text-bg disabled:opacity-60">{estado === "salvando" ? "Salvando…" : "💾 Salvar para os alunos"}</button>
      )}
      {estado !== "livre" && estado !== "salvando" && estado !== "ok" ? <p role="alert" className="text-xs text-red">{estado}</p> : null}
    </section>
  );
}
