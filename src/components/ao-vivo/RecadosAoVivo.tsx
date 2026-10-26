"use client";

// Recado do personal no meio do treino: a tela do treino consulta a cada 20 s
// (só com a tela aberta) e mostra o recado novo no topo, como notificação.
import { useEffect, useRef, useState } from "react";
import type { RecadoAoVivo } from "@/lib/data/ao-vivo";

const INTERVALO_MS = 20_000;
const chaveVistos = (sessaoId: string) => `montinho-recados-vistos:${sessaoId}`;

function lerVistos(sessaoId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(chaveVistos(sessaoId)) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function gravarVistos(sessaoId: string, ids: string[]) {
  try {
    localStorage.setItem(chaveVistos(sessaoId), JSON.stringify(ids.slice(-50)));
  } catch {
    // sem armazenamento: o recado pode aparecer de novo, sem problema
  }
}

export function RecadosAoVivo({ sessaoId }: { sessaoId: string }) {
  const [fila, setFila] = useState<RecadoAoVivo[]>([]);
  const vistos = useRef<Set<string>>(new Set());

  useEffect(() => {
    vistos.current = new Set(lerVistos(sessaoId));
    let vivo = true;
    async function buscar() {
      if (document.visibilityState !== "visible") return;
      const r = await fetch(`/api/sessoes/${sessaoId}/recados`, { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null) as { recados?: RecadoAoVivo[] } | null;
      if (!vivo || !r?.recados) return;
      const novos = r.recados.filter((x) => !vistos.current.has(x.id));
      if (!novos.length) return;
      novos.forEach((x) => vistos.current.add(x.id));
      gravarVistos(sessaoId, [...vistos.current]);
      setFila((f) => [...f, ...novos]);
      try {
        navigator.vibrate?.([120, 60, 120]);
      } catch {
        // sem vibração
      }
    }
    void buscar();
    const t = window.setInterval(() => void buscar(), INTERVALO_MS);
    const aoVoltar = () => void buscar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [sessaoId]);

  const atual = fila[0];
  if (!atual) return null;
  return (
    <div role="alert" aria-live="assertive" className="fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="recado-entra w-full max-w-md rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#3a3016_0%,#171717_80%)] p-4 shadow-2xl">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">💬 Recado do Montinho · agora</p>
        <p className="mt-1 text-lg font-bold leading-snug">{atual.texto}</p>
        <button type="button" onClick={() => setFila((f) => f.slice(1))} className="alvo mt-3 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-bg">
          {fila.length > 1 ? `Valeu! (mais ${fila.length - 1})` : "Valeu! 💪"}
        </button>
      </div>
    </div>
  );
}
