"use client";

// Linha discreta no descanso (Fase 3 das ofertas): só no exercício com a carga
// parada (3 vezes sem subir em 14+ dias), no máximo 1 por treino, nunca com dor,
// e só para quem pode fazer aula presencial com o Pacote Flexível ligado.
import { useEffect, useState } from "react";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import { registrarOferta } from "./OfertaPlano";
import type { ContextoOferta } from "@/lib/data/ofertas";
import type { HistoricoOferta } from "@/lib/ofertas/regras";

let contexto: Promise<ContextoOferta | null> | null = null;
const buscar = () =>
  (contexto ??= fetch("/api/ofertas", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { contexto: ContextoOferta | null } | null) => j?.contexto ?? null)
    .catch(() => null));

const DIA = 86_400_000;

export function OfertaNoDescanso({ sessaoId, exercicio, whatsapp }: { sessaoId: string; exercicio: string; whatsapp: string }) {
  const [ver, setVer] = useState(false);
  const chave = `montinho-oferta-descanso:${sessaoId}`;
  useEffect(() => {
    let vivo = true;
    void buscar().then((ctx) => {
      if (!vivo || !ctx || ctx.dor || !ctx.ofertas.some((o) => o.id === "pacote")) return;
      try {
        const ja = sessionStorage.getItem(chave);
        if (ja && ja !== exercicio) return; // 1 por treino
        const h = JSON.parse(localStorage.getItem("montinho-ofertas") ?? "{}") as HistoricoOferta;
        const pausa = ctx.publico === "visitante" ? 7 : 14;
        if ((h.dispensada?.pacote && Date.now() - h.dispensada.pacote < pausa * DIA) || (h.clicada?.pacote && Date.now() - h.clicada.pacote < 14 * DIA)) return;
        if (!ja) {
          sessionStorage.setItem(chave, exercicio);
          registrarOferta("pacote", "exibido", "descanso");
        }
      } catch {
        return;
      }
      setVer(true);
    });
    return () => {
      vivo = false;
    };
  }, [chave, exercicio]);

  if (!ver) return null;
  function marcar(campo: "dispensada" | "clicada") {
    try {
      const h = JSON.parse(localStorage.getItem("montinho-ofertas") ?? "{}") as HistoricoOferta;
      localStorage.setItem("montinho-ofertas", JSON.stringify({ ...h, [campo]: { ...(h[campo] ?? {}), pacote: Date.now() } }));
    } catch {}
  }
  return (
    <div className="space-y-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
      <div className="flex items-start gap-2">
        <p className="flex-1 leading-snug text-fg-muted"><span className="font-bold text-fg">Carga travada no {exercicio}?</span> Numa aula comigo eu ajusto a técnica ao vivo. Pacote Flexível: 10 aulas quando der.</p>
        <button type="button" aria-label="Agora não" onClick={() => { marcar("dispensada"); registrarOferta("pacote", "dispensado", "descanso"); setVer(false); }} className="alvo -mr-1 text-fg-subtle hover:text-fg">✕</button>
      </div>
      <FalarComMontinho origem="pacote" whatsapp={whatsapp} visitante={false} compacto texto="💬 Quero saber" onClick={() => { marcar("clicada"); registrarOferta("pacote", "clicado", "descanso"); }} />
    </div>
  );
}
