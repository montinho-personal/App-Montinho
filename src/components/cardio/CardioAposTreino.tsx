"use client";

// Fim da musculação: se há cardio prescrito para hoje, oferece registrar na
// hora (ligado ao treino, sem duplicar). O treino de força já está salvo:
// deixar o cardio pendente não invalida nada.
import { useEffect, useState } from "react";
import { CardioHoje } from "./CardioHoje";
import type { CardioPrescricao } from "@/lib/supabase/types-extended";

export function CardioAposTreino({ sessionId, nome }: { sessionId: string; nome?: string }) {
  const [pendentes, setPendentes] = useState<CardioPrescricao[] | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/cardio")
      .then((r) => (r.ok ? r.json() : { pendentes: [] }))
      .then((d: { pendentes: CardioPrescricao[] }) => vivo && setPendentes(d.pendentes.filter((p) => p.vinculo !== "antes_treino")))
      .catch(() => vivo && setPendentes([]));
    return () => { vivo = false; };
  }, []);
  if (!pendentes?.length) return null;
  return (
    <div className="space-y-1">
      <CardioHoje pendentes={pendentes} sessionId={sessionId} nome={nome} livre={false} titulo="Agora o cardio de hoje" compacto />
      <p className="text-center text-[11px] text-fg-subtle">Seu treino de musculação já está salvo. Se não der agora, registre depois em Montinho Cardio.</p>
    </div>
  );
}
