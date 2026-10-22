"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

/** Aviso + botão para aplicar o padrão (até a falha + aquecimento) nos treinos atuais do aluno. */
export function AplicarPadraoCard({ alunoId, fora }: { alunoId: string; fora: number }) {
  const router = useRouter();
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);
  async function aplicar() {
    if (!window.confirm(`Ajustar ${fora} exercício(s): “Chegar todas até a falha!” e aquecimento no 1º exercício de cada treino? As suas edições no montador e o histórico continuam.`)) return;
    setEnviando(true);
    const r = await fetch(`/api/alunos/${alunoId}/padrao-ficha`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmar: true }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { error?: string; alterados?: number; versao?: number } | null;
    setEnviando(false);
    if (!r?.ok) return toast.error(d?.error ?? "Não foi possível aplicar agora.");
    toast.success(d?.alterados ? `Pronto: ${d.alterados} exercício(s) ajustado(s) (versão ${d.versao}).` : "Os treinos já estavam no padrão.");
    router.refresh();
  }
  return (
    <Card className="border-warning/50">
      <CardBody className="space-y-2">
        <p className="text-sm font-bold">Padrão da ficha pendente</p>
        <p className="text-sm text-fg-muted">
          {fora} exercício(s) dos treinos atuais ainda sem “Chegar todas até a falha!” ou sem o aquecimento no 1º exercício. Ajusta por cima do que está aí: as suas edições no montador e o histórico do aluno continuam.
        </p>
        <button type="button" disabled={enviando} onClick={() => void aplicar()} className="touch w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-bg disabled:opacity-60">
          {enviando ? "Aplicando…" : "Aplicar o padrão nos treinos"}
        </button>
      </CardBody>
    </Card>
  );
}
