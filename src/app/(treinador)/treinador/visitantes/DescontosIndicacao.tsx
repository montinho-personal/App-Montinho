"use client";
// Descontos de indicação a aplicar (0102): quem indicou amigos que fecharam.
// O pagamento é fora do app; aqui o personal só marca “desconto usado”.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import type { DescontoAAplicar } from "@/lib/data/indicacao";

export function DescontosIndicacao({ itens }: { itens: DescontoAAplicar[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  if (!itens.length) return <p className="text-sm text-fg-muted">Ninguém com desconto para usar agora. Quando um amigo indicado fechar (você passa ele para aluno aqui embaixo), quem indicou ganha 10% e aparece nesta lista.</p>;
  async function usado(d: DescontoAAplicar) {
    if (!window.confirm(`Marcar os ${d.pct}% de ${d.nome.split(" ")[0]} como usados?`)) return;
    setOcupado(d.indicadorId);
    setErro(null);
    const r = await fetch("/api/indicacao/desconto-usado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ indicadorId: d.indicadorId }) }).catch(() => null);
    setOcupado(null);
    if (!r?.ok) return setErro("Não foi possível salvar agora. Tente de novo.");
    router.refresh();
  }
  return (
    <div className="space-y-2">
      {erro ? <p role="alert" className="text-sm text-red">{erro}</p> : null}
      <ul className="divide-y divide-border">
        {itens.map((d) => {
          const whats = d.telefone ? linkWhatsApp(d.telefone, `Oi, ${d.nome.split(" ")[0]}! Seu amigo fechou com o Montinho pelo seu convite e você ganhou ${d.pct}% de desconto no seu plano. Chalalá! 🎁`) : null;
          return (
            <li key={d.indicadorId} className="flex flex-wrap items-center gap-3 py-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-success/15 text-lg font-black text-success">{d.pct}%</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{d.nome} {d.visitante ? <span className="text-xs font-normal text-fg-muted">(visitante)</span> : null}</span>
                <span className="block text-xs text-fg-muted">Indicou: {d.amigos.join(", ")}{d.guardado ? ` · +${d.guardado}% guardados para depois` : ""}</span>
              </span>
              <span className="flex gap-2">
                {whats ? <a href={whats} target="_blank" rel="noopener noreferrer" className="touch rounded-lg border border-border px-3 py-2 text-sm font-semibold">💬 Avisar</a> : null}
                <button type="button" disabled={ocupado === d.indicadorId} onClick={() => void usado(d)} className="touch rounded-lg bg-success px-3 py-2 text-sm font-bold text-bg disabled:opacity-60">✅ Desconto usado</button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
