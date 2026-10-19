"use client";

import { useEffect, useRef, useState } from "react";

type RestTimerProps = {
  duracaoSeg: number;
  onComplete?: () => void;
  autoStart?: boolean;
};

function beep() {
  if (typeof window === "undefined") return;
  try {
    type WebkitWindow = Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AC = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* ignore */
  }
}

function vibrar() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}

export function RestTimer({ duracaoSeg, onComplete, autoStart = false }: RestTimerProps) {
  const [restantes, setRestantes] = useState(duracaoSeg);
  const [rodando, setRodando] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!rodando) return;
    intervalRef.current = setInterval(() => {
      setRestantes((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          beep();
          vibrar();
          setRodando(false);
          onComplete?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rodando, onComplete]);

  function toggle() {
    if (restantes === 0) {
      setRestantes(duracaoSeg);
      setRodando(true);
    } else {
      setRodando((r) => !r);
    }
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRodando(false);
    setRestantes(duracaoSeg);
  }

  const min = Math.floor(restantes / 60);
  const seg = restantes % 60;
  const pct = ((duracaoSeg - restantes) / duracaoSeg) * 100;

  return (
    <div className="flex items-center gap-3 bg-bg border border-border rounded-lg px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shrink-0 ${
          rodando ? "bg-accent text-fg" : restantes === 0 ? "bg-success text-bg" : "bg-card text-fg-muted hover:bg-card-hover"
        }`}
        aria-label={rodando ? "Pausar" : "Iniciar"}
      >
        {rodando ? "⏸" : restantes === 0 ? "↻" : "▶"}
      </button>
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-lg font-bold tabular-nums">
            {String(min).padStart(2, "0")}:{String(seg).padStart(2, "0")}
          </span>
          <span className="text-[10px] text-fg-subtle uppercase tracking-wider">descanso</span>
        </div>
        <div className="h-1 w-full bg-card rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {restantes !== duracaoSeg && !rodando ? (
        <button
          type="button"
          onClick={reset}
          className="text-xs text-fg-subtle hover:text-fg px-2"
        >
          reset
        </button>
      ) : null}
    </div>
  );
}
