"use client";

// Sugestão automática de extra (grupos abaixo da meta). O aluno só pode PEDIR:
// quem libera é sempre o personal.
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { SugestaoExtra } from "@/lib/treino/sugestao-extra";
import { BRAND } from "@/config/brand";

export function SugestaoExtraCard({ s }: { s: SugestaoExtra }) {
  const toast = useToast();
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  async function pedir() {
    setOcupado(true);
    const res = await fetch("/api/adaptacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo: "outro", exercicio_nome: s.titulo.slice(0, 120), descricao: `Pedido de treino extra sugerido pelo app. ${s.descricao}`.slice(0, 500) }) }).catch(() => null);
    setOcupado(false);
    if (res?.ok) {
      setEnviado(true);
      toast.success(`Pedido enviado. O ${BRAND.name} vai avaliar.`);
    } else toast.error("Não foi possível enviar agora. Tente de novo.");
  }
  return (
    <section className="space-y-2 rounded-xl border border-accent/40 bg-grain-strong p-4 text-sm" aria-label="Sugestão automática de treino extra">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Sugestão do app para esta semana</p>
      <p className="font-semibold">
        {s.grupos.map((g) => g.rotulo).join(" e ")} {s.grupos.length > 1 ? "estão" : "está"} abaixo da sua meta semanal
      </p>
      <ul className="space-y-0.5 text-xs text-fg-muted">
        {s.grupos.map((g) => (
          <li key={g.grupo}>{g.rotulo}: {String(g.feito).replace(".", ",")} de {g.meta} séries nos últimos 7 dias</li>
        ))}
      </ul>
      <ul className="space-y-0.5">
        {s.exercicios.map((x) => (
          <li key={x.nome}>• <strong>{x.nome}</strong> — {x.series} × {x.reps}</li>
        ))}
      </ul>
      <p className="text-xs text-fg-muted">≈ {s.duracaoMin} min. Esta sugestão só vale depois que o {BRAND.name} aprovar.</p>
      {enviado ? (
        <p className="text-xs font-semibold text-success">Pedido enviado ✓ — a resposta aparece aqui e no início.</p>
      ) : (
        <button type="button" onClick={pedir} disabled={ocupado} className="touch w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-bg disabled:opacity-60">
          Pedir ao {BRAND.name}
        </button>
      )}
    </section>
  );
}
