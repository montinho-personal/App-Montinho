"use client";

// “Cancelar este treino”: para quem começou o treino errado. Só aparece quando
// nenhuma série foi marcada — o treino fica encerrado sem séries, não conta na
// semana nem gera medalha. Com séries, o caminho é “Encerrar sem concluir”.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type Props = {
  sessaoId: string;
  series: number;
  /** Aula presencial: cabeçalho com o aluno da aula. */
  cabecalho?: Record<string, string>;
  rotulo?: string;
  className?: string;
};

export function CancelarTreino({ sessaoId, series, cabecalho = {}, rotulo = "Cancelar este treino", className = "" }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);
  if (series > 0) return null;

  async function cancelar() {
    if (!window.confirm("Cancelar este treino? Nenhuma série foi marcada: ele não conta na semana e você pode começar outro.")) return;
    setOcupado(true);
    const r = await fetch(`/api/sessoes/${sessaoId}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...cabecalho }, body: JSON.stringify({ status: "abandonada" }) }).catch(() => null);
    setOcupado(false);
    if (!r?.ok) return toast.error("Não foi possível cancelar agora. Tente de novo com internet.");
    toast.success("Treino cancelado. Pode começar o treino certo!");
    router.refresh();
  }

  return (
    <button type="button" disabled={ocupado} onClick={() => void cancelar()} className={`alvo text-sm font-semibold text-red underline underline-offset-4 disabled:opacity-50 ${className}`}>
      {ocupado ? "Cancelando…" : `✖ ${rotulo}`}
    </button>
  );
}
