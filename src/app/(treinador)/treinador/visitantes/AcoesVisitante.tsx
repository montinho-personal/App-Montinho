"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcoesVisitante({ id, vencido }: { id: string; vencido: boolean }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function enviar(corpo: object, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    setOcupado(true);
    const r = await fetch(`/api/treinador/visitantes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
    setOcupado(false);
    if (!r?.ok) window.alert("Não foi possível fazer isso agora. Tente de novo.");
    router.refresh();
  }

  const botao = "alvo min-h-11 rounded-lg border border-border px-3 text-sm hover:border-white/40 disabled:opacity-50";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={ocupado} className={botao} onClick={() => void enviar({ acao: "renovar", dias: 30 })}>
        {vencido ? "Liberar +30 dias" : "+30 dias"}
      </button>
      {!vencido ? (
        <button type="button" disabled={ocupado} className={`${botao} text-fg-muted`} onClick={() => void enviar({ acao: "encerrar" }, "Encerrar o acesso agora? A pessoa continua vendo o histórico, mas não registra treinos novos.")}>
          Encerrar
        </button>
      ) : null}
      <button type="button" disabled={ocupado} className={`${botao} border-accent text-accent`} onClick={() => void enviar({ acao: "converter" }, "Transformar em aluno da consultoria? Ele passa para a lista de Alunos, com todo o histórico.")}>
        Virou aluno
      </button>
    </div>
  );
}
