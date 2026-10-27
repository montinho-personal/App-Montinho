"use client";

// “Cardio de hoje”: o prescrito que falta hoje, com botão grande para
// registrar, e “Registrar outro cardio” (livre). Usado no Montinho Cardio,
// no Início e no fim da musculação.
import { useEffect, useState } from "react";
import { RegistrarCardio } from "./RegistrarCardio";
import { CronometroCardio } from "./CronometroCardio";
import { eventoGa } from "@/components/analytics/ga";
import { INTENSIDADES, infoModalidade } from "@/lib/cardio/modalidades";
import type { CardioPrescricao } from "@/lib/supabase/types-extended";

type P = Pick<CardioPrescricao, "id" | "modalidade" | "nome" | "duracao_min" | "intensidade" | "tipo" | "intervalos" | "observacoes" | "fc_alvo_min" | "fc_alvo_max">;

export function CardioHoje({ pendentes, nome, sessionId, livre = true, titulo = "Cardio de hoje", compacto = false, rota }: { pendentes: P[]; nome?: string; sessionId?: string | null; livre?: boolean; titulo?: string; compacto?: boolean; rota?: string }) {
  const [aberto, setAberto] = useState<P | "livre" | null>(null);
  const [cronometro, setCronometro] = useState<P | "livre" | null>(null);
  const [feitos, setFeitos] = useState<string[]>([]);
  const lista = pendentes.filter((p) => !feitos.includes(p.id));
  useEffect(() => {
    if (pendentes.length && !rota) eventoGa("cardio_view", { pendentes: pendentes.length });
  }, [pendentes.length, rota]);
  if (!lista.length && !livre) return null;
  const abrir = (p: P | "livre") => {
    if (!rota) eventoGa("cardio_started", { prescrito: p === "livre" ? 0 : 1 });
    setAberto(p);
  };
  return (
    <section className="space-y-2" aria-label={titulo}>
      {lista.length ? <h2 className={`${compacto ? "text-sm" : "text-base"} font-bold`}>❤️‍🔥 {titulo}</h2> : null}
      {lista.map((p) => {
        const m = infoModalidade(p.modalidade);
        return (
          <div key={p.id} className="rounded-xl border border-accent/40 bg-accent/5 p-3">
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden>{m.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{p.nome ?? m.nome} · {p.duracao_min} min</p>
                <p className="text-xs text-fg-muted">
                  {INTENSIDADES[p.intensidade].nome} ({INTENSIDADES[p.intensidade].dica.toLowerCase()})
                  {p.tipo === "intervalado" ? ` · intervalado${p.intervalos ? `: ${p.intervalos}` : ""}` : ""}
                  {p.fc_alvo_min || p.fc_alvo_max ? ` · FC ${p.fc_alvo_min ?? "?"}–${p.fc_alvo_max ?? "?"} bpm` : ""}
                </p>
                {p.observacoes && !compacto ? <p className="mt-1 text-xs text-fg-muted">📝 {p.observacoes}</p> : null}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => abrir(p)} className="alvo rounded-xl bg-accent px-3 py-3 text-sm font-bold text-bg">Já fiz: registrar</button>
              {rota ? null : <button type="button" onClick={() => setCronometro(p)} className="alvo rounded-xl border border-accent/60 px-3 py-3 text-sm font-bold text-accent">⏱ Fazer agora</button>}
            </div>
          </div>
        );
      })}
      {livre ? (
        // Sem prescrição para agora: “Iniciar cardio agora” (cronômetro) ou anotar o que já fez.
        <div className={rota ? "" : "grid grid-cols-2 gap-2"}>
          {rota ? null : (
            <button type="button" onClick={() => setCronometro("livre")} className={`alvo rounded-xl px-3 py-3 text-sm font-bold ${lista.length ? "border border-accent/60 text-accent" : "bg-accent text-bg"}`}>
              ⏱ Iniciar {lista.length ? "outro " : ""}cardio agora
            </button>
          )}
          <button type="button" onClick={() => abrir("livre")} className="alvo w-full rounded-xl border border-border px-3 py-3 text-sm font-semibold">
            ➕ {rota ? `Registrar ${lista.length ? "outro " : ""}cardio` : "Já fiz: registrar"}
          </button>
        </div>
      ) : null}
      {cronometro === "livre" ? <CronometroCardio minutos={20} escolherMinutos sessionId={sessionId} nome={nome} onFechar={() => setCronometro(null)} /> : cronometro ? <CronometroCardio minutos={cronometro.duracao_min} prescricao={cronometro} sessionId={sessionId} nome={nome} onFechar={() => setCronometro(null)} /> : null}
      {aberto ? (
        <RegistrarCardio
          prescricao={aberto === "livre" ? null : aberto}
          sessionId={sessionId}
          nome={nome}
          rota={rota}
          onFechar={() => setAberto(null)}
          onRegistrado={() => { if (aberto !== "livre") setFeitos((f) => [...f, aberto.id]); }}
        />
      ) : null}
    </section>
  );
}
