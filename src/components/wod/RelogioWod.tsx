"use client";

// Relógio do WOD em tela cheia (Multimodalidade, fase 3). A conta sai do
// horário de início e das pausas guardados no aparelho, então bloquear a tela
// ou sair do app não perde nada. 10 s de preparação, vibração e bipe opcional
// na troca de intervalo, nos 3 últimos segundos e no fim.
import { useEffect, useRef, useState } from "react";
import { deveAvisar, estadoRelogio, relogioTexto, segundosDeTreino, type EstadoRelogio, type Pausa } from "@/lib/modalidades/relogio";
import { resumoBloco } from "@/lib/modalidades/blocos";
import type { BlocoTreino } from "@/lib/modalidades/tipos";

const PREPARO_SEG = 10;
type Guardado = { inicio: number; pausas: Pausa[] };
const chave = (sessaoId: string, blocoId: string) => `montinho-relogio:${sessaoId}:${blocoId}`;

export function lerRelogioGuardado(sessaoId: string, blocoId: string): Guardado | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(chave(sessaoId, blocoId)) ?? "null") as Guardado | null;
    return v && typeof v.inicio === "number" ? v : null;
  } catch {
    return null;
  }
}
function guardar(sessaoId: string, blocoId: string, v: Guardado | null) {
  try {
    if (v) sessionStorage.setItem(chave(sessaoId, blocoId), JSON.stringify(v));
    else sessionStorage.removeItem(chave(sessaoId, blocoId));
  } catch {
    // sem armazenamento: o relógio funciona enquanto a tela estiver aberta
  }
}

function bipe(curto: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = curto ? 880 : 1320;
    g.gain.value = 0.15;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (curto ? 0.12 : 0.5));
    o.onended = () => void ctx.close();
  } catch {
    // sem som
  }
}

export function RelogioWod({ sessaoId, bloco, onFechar, onTerminar }: { sessaoId: string; bloco: BlocoTreino; onFechar: () => void; onTerminar: (tempoSeg: number, terminouNoTempo: boolean) => void }) {
  const [g, setG] = useState<Guardado | null>(() => (typeof window === "undefined" ? null : lerRelogioGuardado(sessaoId, bloco.id)));
  const [agora, setAgora] = useState(() => Date.now());
  const [som, setSom] = useState(true);
  const anterior = useRef<EstadoRelogio | null>(null);
  const avisouFim = useRef(false);

  // Tela acesa enquanto o relógio estiver aberto.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const pausado = !!g?.pausas.some((p) => p.ate == null);
  const comecaEm = g ? g.inicio + PREPARO_SEG * 1000 : null;
  const preparando = comecaEm != null && agora < comecaEm;
  const decorrido = g && comecaEm != null && !preparando ? segundosDeTreino(comecaEm, g.pausas, agora) : 0;
  const est = estadoRelogio(bloco, decorrido);

  useEffect(() => {
    if (preparando) {
      const falta = Math.ceil(((comecaEm ?? 0) - agora) / 1000);
      if (falta <= 3 && falta >= 1 && anterior.current?.decorridoSeg !== -falta) {
        anterior.current = { ...est, decorridoSeg: -falta };
        if (som) bipe(true);
      }
      return;
    }
    if (!g || pausado) return;
    const a = anterior.current;
    anterior.current = est;
    if (!a || a.decorridoSeg < 0) return;
    const aviso = deveAvisar(a, est);
    if (!aviso) return;
    try {
      navigator.vibrate?.(aviso === "fim" ? [300, 120, 300] : aviso === "troca" ? [200] : [60]);
    } catch {
      // sem vibração
    }
    if (som) bipe(aviso === "contagem");
    if (aviso === "fim" && !avisouFim.current) {
      avisouFim.current = true;
      guardar(sessaoId, bloco.id, null);
      window.setTimeout(() => onTerminar(est.decorridoSeg, true), 900);
    }
  });

  function comecar() {
    const v = { inicio: Date.now(), pausas: [] };
    guardar(sessaoId, bloco.id, v);
    setG(v);
  }
  function pausarOuSeguir() {
    if (!g) return;
    const agoraMs = Date.now();
    const pausas = pausado ? g.pausas.map((p) => (p.ate == null ? { ...p, ate: agoraMs } : p)) : [...g.pausas, { de: agoraMs, ate: null }];
    const v = { ...g, pausas };
    guardar(sessaoId, bloco.id, v);
    setG(v);
  }
  function terminar() {
    guardar(sessaoId, bloco.id, null);
    onTerminar(decorrido, false);
  }
  function zerar() {
    guardar(sessaoId, bloco.id, null);
    setG(null);
    anterior.current = null;
    avisouFim.current = false;
  }

  const grande = preparando ? Math.ceil(((comecaEm ?? 0) - agora) / 1000) : est.regressivo ? est.restanteSeg : est.decorridoSeg;
  const corFase = preparando ? "text-warning" : est.fase === "descanso" ? "text-success" : est.fase === "fim" ? "text-accent" : "text-fg";
  const progressivoComCap = !est.regressivo && est.restanteSeg != null;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Relógio: ${resumoBloco(bloco)}`} className="fixed inset-0 z-[90] flex flex-col bg-bg">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button type="button" onClick={onFechar} className="alvo text-sm text-fg-muted">← Voltar</button>
        <p className="min-w-0 truncate text-sm font-bold">{resumoBloco(bloco)}</p>
        <button type="button" onClick={() => setSom((x) => !x)} aria-pressed={som} className="alvo text-sm" aria-label={som ? "Desligar som" : "Ligar som"}>{som ? "🔊" : "🔇"}</button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        {!g ? (
          <>
            <p className="text-sm text-fg-muted">Quando tocar em Começar, você tem {PREPARO_SEG} segundos para se posicionar.</p>
            <button type="button" onClick={comecar} className="alvo rounded-2xl bg-accent px-10 py-5 text-2xl font-black text-bg">▶ Começar</button>
          </>
        ) : (
          <>
            <p className={`text-sm font-bold uppercase tracking-wider ${corFase}`}>
              {preparando ? "Prepare-se" : pausado ? "Pausado" : est.fase === "descanso" ? "Descanso" : est.fase === "fim" ? "Tempo!" : bloco.formato === "death_by" ? `Minuto ${est.intervalo}: ${est.intervalo} reps` : "Vai!"}
            </p>
            <p className={`font-mono text-7xl font-black tabular-nums sm:text-8xl ${corFase}`} aria-live="off">{preparando ? grande : relogioTexto(grande)}</p>
            {est.intervalo != null && !preparando ? (
              <p className="text-lg font-bold">
                {bloco.formato === "emom" ? "Minuto" : "Round"} {Math.min(est.intervalo, est.totalIntervalos ?? est.intervalo)}
                {est.totalIntervalos ? ` de ${est.totalIntervalos}` : ""} · {relogioTexto(est.restanteFaseSeg)}
              </p>
            ) : null}
            {progressivoComCap && !preparando ? <p className="text-sm text-fg-muted">Limite: faltam {relogioTexto(est.restanteSeg)}</p> : null}
          </>
        )}
      </div>

      {g ? (
        <div className="grid grid-cols-2 gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!est.terminou ? (
            <button type="button" onClick={pausarOuSeguir} disabled={preparando} className="alvo rounded-xl border border-border py-4 text-base font-bold disabled:opacity-40">{pausado ? "▶ Continuar" : "⏸ Pausar"}</button>
          ) : (
            <button type="button" onClick={zerar} className="alvo rounded-xl border border-border py-4 text-base font-bold">↺ Zerar</button>
          )}
          <button type="button" onClick={terminar} disabled={preparando} className="alvo rounded-xl bg-accent py-4 text-base font-black text-bg disabled:opacity-40">
            {est.regressivo ? "✓ Encerrar e anotar" : "🏁 Terminei!"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
