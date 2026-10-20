"use client";

// Fim de treino: uma explicação ligada ao que aconteceu hoje (meta, treino
// reduzido, recorde). Respeita o limite de 1 sugestão nova por sessão.
import Link from "next/link";
import { useEffect, useState } from "react";
import { marcarSugestao, sugestoesDaSessao } from "./LeituraRapida";
import { REGRAS_DESBLOQUEIA } from "@/lib/desbloqueia/motor";
import { enviarEvento } from "@/components/chalala/evento";

export function SugestaoConclusao({ sessaoId, d }: { sessaoId: string; d: { id: string; pergunta: string; chamada: string } }) {
  const [mostrar] = useState(() => {
    const ja = sugestoesDaSessao(sessaoId);
    return ja.includes(d.id) || ja.length < REGRAS_DESBLOQUEIA.sugestoesPorSessao;
  });
  useEffect(() => {
    if (!mostrar) return;
    if (!sugestoesDaSessao(sessaoId).includes(d.id)) marcarSugestao(sessaoId, d.id);
    enviarEvento({ tipo: "sugestao_vista", modelo: d.id, origem: "fim_treino" });
  }, [mostrar, sessaoId, d.id]);
  if (!mostrar) return null;
  return (
    <Link href={`/aluno/descobertas/${d.id}?o=contexto`} onClick={() => enviarEvento({ tipo: "sugestao_aberta", modelo: d.id, origem: "fim_treino" })} className="block rounded-xl border border-accent/40 bg-grain-strong p-4">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">Montinho Desbloqueia</span>
      <span className="mt-1 block text-sm font-semibold leading-snug">{d.chamada}</span>
      <span className="mt-1 block text-xs font-semibold text-accent">Descobrir agora →</span>
    </Link>
  );
}
