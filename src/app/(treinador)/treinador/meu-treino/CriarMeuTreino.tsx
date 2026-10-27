"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function CriarMeuTreino() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function criar() {
    setCarregando(true);
    setErro(null);
    const r = await fetch("/api/meu-treino", { method: "POST" }).catch(() => null);
    const j = await r?.json().catch(() => ({}));
    setCarregando(false);
    if (!r?.ok) return setErro(j?.error ?? "Sem internet. Tente de novo.");
    router.refresh();
  }
  return (
    <div className="space-y-2">
      <Button onClick={criar} loading={carregando} size="lg">Criar a minha ficha de aluno</Button>
      {erro ? <p role="alert" className="text-sm text-red">{erro}</p> : null}
    </div>
  );
}
