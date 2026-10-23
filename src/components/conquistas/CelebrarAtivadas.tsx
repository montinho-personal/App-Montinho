"use client";

// Troféus ganhos fora do treino (ex.: Olhar de Águia ativado pelo personal):
// comemora no início do app, uma vez só, e marca como visto.
import { useState } from "react";
import { CelebracaoMedalha, type ConquistaCelebravel } from "@/components/chalala/CelebracaoMedalha";
import { useMontado } from "@/lib/ui/montado";

export function CelebrarAtivadas({ conquistas, nome }: { conquistas: Array<ConquistaCelebravel & { id: string }>; nome: string }) {
  const [abertas, setAbertas] = useState(conquistas);
  // Só depois de montar no aparelho (a comemoração usa a tela inteira).
  const montado = useMontado();
  if (!montado || !abertas.length) return null;
  const fechar = () => {
    fetch("/api/conquistas/vistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: abertas.map((c) => c.id) }) }).catch(() => undefined);
    setAbertas([]);
  };
  return <CelebracaoMedalha conquistas={abertas} nome={nome} onFechar={fechar} />;
}
