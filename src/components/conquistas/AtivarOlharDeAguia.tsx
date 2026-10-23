"use client";

// Botão do personal: ativa o troféu “Olhar de Águia” de quem já enviou o vídeo.
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AtivarOlharDeAguia({ alunoId, ativo }: { alunoId: string; ativo: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"livre" | "enviando" | "erro">("livre");
  if (ativo) return <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">🦅 <span className="font-semibold">Olhar de Águia</span> já ativado para este aluno.</p>;
  async function ativar() {
    if (!window.confirm("Ativar o troféu “Olhar de Águia”? Use quando o aluno já tiver enviado o vídeo de execução pelo WhatsApp.")) return;
    setEstado("enviando");
    const r = await fetch(`/api/alunos/${alunoId}/olhar-de-aguia`, { method: "POST" }).catch(() => null);
    if (!r?.ok) return setEstado("erro");
    setEstado("livre");
    router.refresh();
  }
  return (
    <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
      <p className="text-sm"><span className="font-bold">🦅 Olhar de Águia</span> <span className="text-fg-muted">— o aluno ganha quando envia para você, pelo WhatsApp, um vídeo de execução para avaliar.</span></p>
      <button type="button" onClick={ativar} disabled={estado === "enviando"} className="touch w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-bold text-bg disabled:opacity-60">
        {estado === "enviando" ? "Ativando…" : "Ativar Olhar de Águia (vídeo recebido no WhatsApp)"}
      </button>
      {estado === "erro" ? <p className="text-xs font-semibold text-red-400" role="alert">Não foi possível ativar agora. Tente de novo.</p> : null}
    </div>
  );
}
