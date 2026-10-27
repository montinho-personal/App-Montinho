"use client";

// Fim da musculação: convite para o cardio. Com cardio prescrito para hoje,
// mostra o prescrito (registrar ou fazer agora com cronômetro). Sem
// prescrição, convida para um cardio rápido de 10/15/20 min, sem culpa:
// “Hoje não” some com o convite. Nunca aparece com dor. A musculação já está
// salva: deixar o cardio para depois não muda nada.
import { useEffect, useState } from "react";
import { CardioHoje } from "./CardioHoje";
import { CronometroCardio } from "./CronometroCardio";
import { RegistrarCardio } from "./RegistrarCardio";
import { eventoGa } from "@/components/analytics/ga";
import { MINUTOS_RAPIDOS, conviteDoTreino, mostrarConvite } from "@/lib/cardio/incentivo";
import type { CardioPrescricao } from "@/lib/supabase/types-extended";

export function CardioAposTreino({ sessionId, nome, dor = false }: { sessionId: string; nome?: string; dor?: boolean }) {
  const [dados, setDados] = useState<{ pendentes: CardioPrescricao[]; jaFezHoje: boolean } | null>(null);
  const [fechado, setFechado] = useState(false);
  const [cronometro, setCronometro] = useState<number | null>(null);
  const [anotar, setAnotar] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch("/api/cardio")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { pendentes: CardioPrescricao[]; jaFezHoje: boolean } | null) => vivo && setDados(d ? { pendentes: d.pendentes.filter((p) => p.vinculo !== "antes_treino"), jaFezHoje: d.jaFezHoje } : null))
      .catch(() => vivo && setDados(null));
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    if (dados && !dados.pendentes.length && mostrarConvite({ concluida: true, dor, jaFezCardioHoje: dados.jaFezHoje })) eventoGa("cardio_view", { origem: "pos_treino" });
  }, [dados, dor]);
  if (!dados || fechado || dor) return null;

  if (dados.pendentes.length)
    return (
      <div className="space-y-1">
        <CardioHoje pendentes={dados.pendentes} sessionId={sessionId} nome={nome} livre={false} titulo="Agora o cardio de hoje" compacto />
        <p className="text-center text-[11px] text-fg-subtle">Seu treino de musculação já está salvo. Se não der agora, registre depois em Montinho Cardio.</p>
      </div>
    );

  if (!mostrarConvite({ concluida: true, dor, jaFezCardioHoje: dados.jaFezHoje })) return null;
  return (
    <section className="space-y-3 rounded-xl border border-accent/40 bg-accent/5 p-4" aria-label="Convite para o cardio">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">❤️‍🔥 Bônus de cardio</p>
      <p className="font-semibold leading-snug">{conviteDoTreino(sessionId)}</p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Quantos minutos?">
        {MINUTOS_RAPIDOS.map((m) => (
          <button key={m} type="button" onClick={() => setCronometro(m)} className={`alvo rounded-xl px-2 py-3 font-black ${m === 15 ? "bg-accent text-bg" : "border border-accent/60 text-accent"}`}>
            {m} min
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" onClick={() => setAnotar(true)} className="text-accent underline-offset-2 hover:underline">Já fiz, quero anotar</button>
        <button type="button" onClick={() => setFechado(true)} className="text-fg-muted underline-offset-2 hover:underline">Hoje não</button>
      </div>
      {cronometro ? <CronometroCardio minutos={cronometro} sessionId={sessionId} nome={nome} onFechar={() => { setCronometro(null); setFechado(true); }} /> : null}
      {anotar ? <RegistrarCardio sessionId={sessionId} nome={nome} onFechar={() => { setAnotar(false); setFechado(true); }} /> : null}
    </section>
  );
}
