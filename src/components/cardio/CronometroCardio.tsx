"use client";

// Cronômetro do cardio rápido (10/15/20 min ou o prescrito): tela cheia,
// contagem regressiva, uma frase de incentivo por minuto e tela acesa.
// Ao terminar (ou parar antes), abre o registro já preenchido.
import { useEffect, useRef, useState } from "react";
import { RegistrarCardio } from "./RegistrarCardio";
import { eventoGa } from "@/components/analytics/ga";
import { MODALIDADES, MODALIDADE_IDS } from "@/lib/cardio/modalidades";
import { fraseDoCronometro, minutosDoCronometro } from "@/lib/cardio/incentivo";
import type { CardioPrescricao, ModalidadeCardio } from "@/lib/supabase/types-extended";

type Prescricao = Pick<CardioPrescricao, "id" | "modalidade" | "duracao_min" | "intensidade" | "tipo" | "intervalos">;
type Sentinela = { release: () => Promise<void> };

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Minutos para escolher no “Iniciar cardio agora” (sem prescrição). */
const MINUTOS_LIVRES = [10, 15, 20, 30, 45, 60];

export function CronometroCardio({ minutos: minutosIniciais, prescricao, sessionId, nome, onFechar, escolherMinutos = false }: { minutos: number; prescricao?: Prescricao | null; sessionId?: string | null; nome?: string; onFechar: () => void; /** Iniciar cardio por conta própria: a pessoa escolhe os minutos antes de começar. */ escolherMinutos?: boolean }) {
  const [minutos, setMinutos] = useState(minutosIniciais);
  const alvo = minutos * 60;
  const [modalidade, setModalidade] = useState<ModalidadeCardio>(prescricao && prescricao.modalidade !== "livre" ? prescricao.modalidade : "esteira");
  const [inicio, setInicio] = useState<number | null>(null);
  const [agora, setAgora] = useState(0);
  const [registrar, setRegistrar] = useState<{ minutos: number; completo: boolean } | null>(null);
  const trava = useRef<Sentinela | null>(null);
  const seg = inicio ? Math.max(0, Math.floor((agora - inicio) / 1000)) : 0;
  const restante = Math.max(0, alvo - seg);
  const terminou = inicio !== null && seg >= alvo;

  useEffect(() => {
    if (!inicio) return;
    const t = setInterval(() => setAgora(Date.now()), 500);
    // Tela acesa enquanto o cronômetro roda (quando o celular deixa).
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinela> } };
    nav.wakeLock?.request("screen").then((s) => (trava.current = s)).catch(() => undefined);
    return () => {
      clearInterval(t);
      trava.current?.release().catch(() => undefined);
      trava.current = null;
    };
  }, [inicio]);

  useEffect(() => {
    if (terminou && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
  }, [terminou]);

  function comecar() {
    const t = Date.now();
    setInicio(t);
    setAgora(t);
    eventoGa("cardio_started", { prescrito: prescricao ? 1 : 0, minutos });
  }

  if (registrar)
    return (
      <RegistrarCardio
        prescricao={prescricao}
        sessionId={sessionId}
        nome={nome}
        inicial={{ minutos: registrar.minutos, modalidade, status: registrar.completo ? "concluido" : "parcial" }}
        onFechar={onFechar}
      />
    );

  const pct = alvo ? Math.min(1, seg / alvo) : 0;
  const R = 88;
  const C = 2 * Math.PI * R;
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-bg px-5 pb-8 pt-6 text-center" role="dialog" aria-modal="true" aria-label="Cronômetro de cardio">
      <button type="button" onClick={onFechar} className="alvo absolute right-3 top-3 rounded-md px-3 py-2 text-fg-muted" aria-label="Fechar">✕</button>
      <p className="text-sm font-semibold text-accent">❤️‍🔥 {minutos} minutos de {MODALIDADES[modalidade].nome.toLowerCase()}</p>
      {!inicio ? (
        <div className="w-full max-w-sm space-y-2">
          {escolherMinutos ? (
            <>
              <p className="text-sm text-fg-muted">Quantos minutos?</p>
              <div className="mb-2 grid grid-cols-6 gap-1.5">
                {MINUTOS_LIVRES.map((m) => (
                  <button key={m} type="button" aria-pressed={minutos === m} onClick={() => setMinutos(m)} className={`touch rounded-lg border py-2 text-sm font-bold ${minutos === m ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>{m}</button>
                ))}
              </div>
            </>
          ) : null}
          <p className="text-sm text-fg-muted">Qual vai ser?</p>
          <div className="grid grid-cols-3 gap-2">
            {MODALIDADE_IDS.filter((m) => m !== "natacao").map((m) => (
              <button key={m} type="button" aria-pressed={modalidade === m} onClick={() => setModalidade(m)} className={`touch rounded-lg border px-1 py-2 text-[11px] font-semibold ${modalidade === m ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>
                <span className="block text-base">{MODALIDADES[m].emoji}</span>
                {MODALIDADES[m].nome}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="relative h-56 w-56">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-border" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} className={terminou ? "text-success" : "text-accent"} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-5xl font-black tabular-nums" aria-live="off">{mmss(inicio ? restante : alvo)}</span>
          <span className="text-xs text-fg-muted">{inicio ? (terminou ? "concluído" : "restantes") : "pronto?"}</span>
        </div>
      </div>
      <p className="min-h-12 max-w-xs text-lg font-semibold" aria-live="polite">{inicio ? fraseDoCronometro(seg, alvo) : "Leve a moderado: dá para conversar em frases curtas."}</p>
      {!inicio ? (
        <button type="button" onClick={comecar} className="alvo w-full max-w-sm rounded-xl bg-accent px-4 py-4 text-lg font-black text-bg">▶ Começar</button>
      ) : terminou ? (
        <button type="button" onClick={() => setRegistrar({ minutos: minutosDoCronometro(seg), completo: true })} className="alvo w-full max-w-sm rounded-xl bg-success px-4 py-4 text-lg font-black text-bg">✅ Registrar cardio</button>
      ) : (
        <button type="button" onClick={() => setRegistrar({ minutos: minutosDoCronometro(seg), completo: false })} className="alvo w-full max-w-sm rounded-xl border border-border px-4 py-3 font-semibold">⏹ Parar e registrar ({minutosDoCronometro(seg)} min)</button>
      )}
    </div>
  );
}
