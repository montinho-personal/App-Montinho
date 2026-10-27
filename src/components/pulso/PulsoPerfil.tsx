"use client";

// Perfil → Montinho Pulso: o aluno decide se o app guarda como o corpo está
// (corpo e sono = dado de saúde). Dá para mudar a qualquer momento.
import { useState } from "react";
import { BRAND } from "@/config/brand";
import { useToast } from "@/components/ui/Toast";
import type { Consentimento } from "@/lib/data/pulso";

export function PulsoPerfil({ inicial }: { inicial: Consentimento }) {
  const toast = useToast();
  const [ligado, setLigado] = useState(inicial === "sim");
  const [salvando, setSalvando] = useState(false);

  async function mudar(sim: boolean) {
    setSalvando(true);
    const r = await fetch("/api/pulso/consentimento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sim }) }).catch(() => null);
    setSalvando(false);
    if (!r?.ok) return toast.error("Não foi possível salvar agora. Tente de novo.");
    setLigado(sim);
    toast.success(sim ? "Pronto! O Pulso pode perguntar como seu corpo está." : "Pronto! O Pulso não vai mais perguntar sobre corpo e sono.");
  }

  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">💛 Montinho Pulso</h2>
          <p className="text-sm text-fg-muted">Antes do treino, o app pergunta rapidinho como você está (opcional, dá para pular).</p>
        </div>
        <button type="button" role="switch" aria-checked={ligado} aria-label="Guardar como meu corpo está" disabled={salvando} onClick={() => void mudar(!ligado)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${ligado ? "bg-accent" : "bg-border"}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${ligado ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      <p className="text-xs text-fg-muted">
        <strong>Guardar como meu corpo está</strong> (cansaço, desconforto e sono): {ligado ? "ligado" : "desligado"}. Só você e o {BRAND.name} veem. Não vai para propaganda, campanhas nem para ninguém mais, e não é avaliação médica.
      </p>
    </section>
  );
}
