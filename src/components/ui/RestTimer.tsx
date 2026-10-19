"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

type RestTimerProps = {
  duracaoSeg: number;
  onComplete?: () => void;
  onDismiss?: () => void;
  autoStart?: boolean;
};

function beep() {
  if (typeof window === "undefined") return;
  try {
    type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* som é opcional */
  }
}

function vibrar() {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([150, 80, 150]);
}

/**
 * Timer de descanso. Usa timestamps (não contagem de intervalos) para
 * continuar correto quando o app vai para segundo plano e volta.
 */
export function RestTimer({ duracaoSeg, onComplete, onDismiss, autoStart = false }: RestTimerProps) {
  const [restantes, setRestantes] = useState(duracaoSeg);
  const [rodando, setRodando] = useState(autoStart);
  const fimRef = useRef<number | null>(null);
  const avisado = useRef(false);

  useEffect(() => {
    if (!rodando) return;
    if (fimRef.current === null) fimRef.current = Date.now() + duracaoSeg * 1000;
    const tick = () => {
      const fim = fimRef.current ?? Date.now();
      const r = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
      setRestantes(r);
      if (r <= 0 && !avisado.current) {
        avisado.current = true;
        beep();
        vibrar();
        setRodando(false);
        onComplete?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [rodando, onComplete, duracaoSeg]);

  function toggle() {
    if (restantes === 0) {
      avisado.current = false;
      fimRef.current = Date.now() + duracaoSeg * 1000;
      setRestantes(duracaoSeg);
      setRodando(true);
      return;
    }
    if (rodando) {
      setRodando(false);
    } else {
      fimRef.current = Date.now() + restantes * 1000;
      setRodando(true);
    }
  }

  function ajustar(delta: number) {
    const novo = Math.max(0, restantes + delta);
    setRestantes(novo);
    if (rodando) fimRef.current = Date.now() + novo * 1000;
  }

  const min = Math.floor(restantes / 60);
  const seg = restantes % 60;
  const pct = duracaoSeg > 0 ? ((duracaoSeg - restantes) / duracaoSeg) * 100 : 100;

  return (
    <div className="flex items-center gap-3 bg-card border border-accent/40 rounded-lg px-3 py-2 shadow-lg" role="timer" aria-live="off" aria-label="Descanso">
      <button type="button" onClick={toggle} className={`touch w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${rodando ? "bg-accent text-bg" : restantes === 0 ? "bg-success text-bg" : "bg-bg border border-border text-fg"}`} aria-label={rodando ? "Pausar descanso" : restantes === 0 ? "Reiniciar descanso" : "Retomar descanso"}>
        <Icon name={rodando ? "pause" : restantes === 0 ? "undo" : "play"} size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-xl font-bold tabular-nums">
            {String(min).padStart(2, "0")}:{String(seg).padStart(2, "0")}
          </span>
          <span className="text-[10px] text-fg-subtle uppercase tracking-wider">{restantes === 0 ? "pode ir" : "descanso"}</span>
        </div>
        <div className="h-1 w-full bg-bg rounded-full overflow-hidden mt-1">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button type="button" onClick={() => ajustar(-15)} className="touch text-xs text-fg-muted px-1" aria-label="Menos 15 segundos">
        −15
      </button>
      <button type="button" onClick={() => ajustar(15)} className="touch text-xs text-fg-muted px-1" aria-label="Mais 15 segundos">
        +15
      </button>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="touch text-fg-subtle hover:text-fg px-1" aria-label="Fechar timer">
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </div>
  );
}
