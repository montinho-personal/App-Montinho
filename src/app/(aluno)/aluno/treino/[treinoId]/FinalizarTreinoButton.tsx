"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function FinalizarTreinoButton({ treinoId }: { treinoId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function finalizar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/treinos/${treinoId}/finalizar`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao finalizar treino");
      toast.success("Treino finalizado. Progresso atualizado.");
      router.push("/aluno");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao finalizar treino");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={finalizar}
      disabled={loading}
      className="mt-3 w-full rounded-lg bg-success px-6 py-3 text-sm font-bold text-bg disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Finalizando..." : "Finalizar treino"}
    </button>
  );
}
