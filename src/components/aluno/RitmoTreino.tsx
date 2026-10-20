"use client";

// "Ritmo do meu treino": tempo transcorrido, previsão e estado (dentro /
// adiantado / atrasado) calculados a partir de horários persistidos. Atualiza a
// cada 15 s e ao voltar para a aba; nunca incentiva acelerar a execução.

import { useEffect, useState } from "react";
import { formatarDuracao, type ResultadoTempo } from "@/lib/tempo/estimar";
import { calcularRitmo, MENSAGEM_RITMO, type Pausas } from "@/lib/tempo/ritmo";

type Props = {
  plano: ResultadoTempo;
  inicioIso: string;
  offsetMs: number;
  pausas: Pausas;
  seriesFeitas: number;
  exerciciosFeitos: number;
  exerciciosTotal: number;
  onPausar: () => void;
  onRetomar: () => void;
};

const COR: Record<string, string> = {
  inicio: "text-fg-muted",
  dentro: "text-success",
  adiantado: "text-info",
  atrasado: "text-warning",
};
const ROTULO: Record<string, string> = { inicio: "Começando", dentro: "Dentro da previsão", adiantado: "Adiantado", atrasado: "Mais longo que o previsto" };

const relogio = (seg: number) => {
  const s = Math.max(0, Math.round(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
};

export function RitmoTreino({ plano, inicioIso, offsetMs, pausas, seriesFeitas, exerciciosFeitos, exerciciosTotal, onPausar, onRetomar }: Props) {
  const [agora, setAgora] = useState<number | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const tick = () => setAgora(Date.now() + offsetMs);
    const primeiro = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15_000);
    const vis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.clearTimeout(primeiro);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [offsetMs, pausas, seriesFeitas]);

  if (agora === null || !plano.totalSeg) return null;
  const r = calcularRitmo({ plano, inicioMs: new Date(inicioIso).getTime(), agoraMs: agora, pausas, seriesFeitas });
  const termino = new Date(new Date(inicioIso).getTime() + (r.terminoPrevistoSeg + pausas.totalMs / 1000 + (pausas.desde ? (agora - pausas.desde) / 1000 : 0)) * 1000);
  const pctSeries = plano.series ? Math.round((Math.min(seriesFeitas, plano.series) / plano.series) * 100) : 0;

  return (
    <section aria-label="Ritmo do treino" className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-lg font-bold leading-tight" aria-live="off">
            {relogio(r.decorridoSeg)}
            <span className="ml-1.5 text-xs font-sans font-normal text-fg-subtle">de ~{formatarDuracao(plano.totalSeg)}</span>
          </p>
          <p className={`text-xs ${r.pausado ? "text-fg-muted" : COR[r.estado]}`}>
            {r.pausado ? "Treino pausado" : ROTULO[r.estado]}
            {!r.pausado && r.restanteSeg > 0 ? ` · faltam ~${formatarDuracao(r.restanteSeg)} · término ~${termino.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </div>
        <button type="button" onClick={r.pausado ? onRetomar : onPausar} className="touch shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg">
          {r.pausado ? "Retomar treino" : "Pausar treino"}
        </button>
        <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="shrink-0 text-xs text-accent">
          {aberto ? "menos" : "detalhes"}
        </button>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-bg" aria-hidden>
        <div className="h-1.5 rounded-full bg-accent transition-[width] motion-reduce:transition-none" style={{ width: `${pctSeries}%` }} />
      </div>
      {aberto ? (
        <div className="mt-2 space-y-1 text-xs text-fg-muted">
          <p>
            Séries: {Math.min(seriesFeitas, plano.series)} de {plano.series} · Exercícios: {exerciciosFeitos} de {exerciciosTotal}
          </p>
          <p>{r.pausado ? "O tempo pausado não conta no treino." : MENSAGEM_RITMO[r.estado]}</p>
          <p className="text-fg-subtle">A previsão é uma estimativa e se ajusta a cada série. Priorize a execução e os descansos: não é preciso correr para cumprir o horário.</p>
        </div>
      ) : null}
    </section>
  );
}
