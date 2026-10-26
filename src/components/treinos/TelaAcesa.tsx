"use client";

// Tela sempre acesa durante o treino (pedido do Montinho, 26/10/2026): usa o
// Screen Wake Lock do navegador. A escolha fica no aparelho (ligada por padrão)
// e pode ser trocada no treino ou no Perfil.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const CHAVE = "montinho-tela-acesa";
const EVENTO = "montinho-tela-acesa";

type Sentinela = { release: () => Promise<void>; addEventListener: (t: "release", f: () => void) => void };
type ComWakeLock = Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinela> } };

export function telaAcesaSuportada(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as ComWakeLock).wakeLock;
}

function lerPreferencia(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== "0";
  } catch {
    return true;
  }
}

function assinar(f: () => void) {
  window.addEventListener(EVENTO, f);
  window.addEventListener("storage", f);
  return () => {
    window.removeEventListener(EVENTO, f);
    window.removeEventListener("storage", f);
  };
}

/** Preferência do aparelho (ligada por padrão), sincronizada entre os componentes da tela. */
export function usePreferenciaTelaAcesa(): [boolean, (v: boolean) => void] {
  const ligada = useSyncExternalStore(assinar, lerPreferencia, () => true);
  const mudar = useCallback((v: boolean) => {
    try {
      localStorage.setItem(CHAVE, v ? "1" : "0");
    } catch {
      // sem armazenamento: não guarda a escolha
    }
    window.dispatchEvent(new Event(EVENTO));
  }, []);
  return [ligada, mudar];
}

const nada = () => () => undefined;
/** O navegador deixa manter a tela acesa? (no servidor, considera que sim) */
export function useSuportaTelaAcesa(): boolean {
  return useSyncExternalStore(nada, telaAcesaSuportada, () => true);
}

/** Mantém a tela acesa enquanto `ativo` (pede de novo quando o app volta para a frente). */
export function useTelaAcesa(ativo: boolean): boolean {
  const [acesa, setAcesa] = useState(false);
  useEffect(() => {
    const wl = (navigator as ComWakeLock).wakeLock;
    if (!ativo || !wl) return;
    let sentinela: Sentinela | null = null;
    let vivo = true;
    async function pedir() {
      if (document.visibilityState !== "visible" || sentinela) return;
      try {
        const s = await wl!.request("screen");
        if (!vivo) return void s.release().catch(() => undefined);
        sentinela = s;
        setAcesa(true);
        s.addEventListener("release", () => {
          sentinela = null;
          if (vivo) setAcesa(false);
        });
      } catch {
        // bateria fraca ou o navegador negou: a tela segue o padrão do celular
        setAcesa(false);
      }
    }
    void pedir();
    const aoVoltar = () => void pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
      void sentinela?.release().catch(() => undefined);
      setAcesa(false);
    };
  }, [ativo]);
  return acesa;
}

/** No treino: mantém a tela acesa (se ligado) e mostra o botão para ligar/desligar. */
export function TelaAcesaTreino() {
  const [ligada, mudar] = usePreferenciaTelaAcesa();
  const suporta = useSuportaTelaAcesa();
  const acesa = useTelaAcesa(ligada && suporta);
  if (!suporta) return null;
  return (
    <button type="button" aria-pressed={ligada} onClick={() => mudar(!ligada)} className={`alvo inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${ligada ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-fg-muted"}`}>
      <span aria-hidden>{ligada ? "🔆" : "🌙"}</span>
      {ligada ? (acesa ? "Tela sempre acesa" : "Tela acesa: ligando…") : "Tela pode apagar"}
    </button>
  );
}

/** No Perfil: a configuração do aparelho. */
export function TelaAcesaPerfil() {
  const [ligada, mudar] = usePreferenciaTelaAcesa();
  const suporta = useSuportaTelaAcesa();
  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">🔆 Tela sempre acesa no treino</h2>
          <p className="text-sm text-fg-muted">Durante o treino, a tela do celular não apaga sozinha. Gasta um pouco mais de bateria.</p>
        </div>
        <button type="button" role="switch" aria-checked={ligada} aria-label="Tela sempre acesa no treino" disabled={!suporta} onClick={() => mudar(!ligada)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${ligada ? "bg-accent" : "bg-border"}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${ligada ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      {!suporta ? <p className="text-xs text-warning">Este celular ou navegador não deixa o app manter a tela acesa. No iPhone, atualize o iOS (16.4 ou mais novo) e use o app instalado na tela de início.</p> : null}
    </section>
  );
}
