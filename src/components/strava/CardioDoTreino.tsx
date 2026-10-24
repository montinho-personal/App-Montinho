"use client";

// Fim do treino: busca no Strava o batimento do relógio deste treino.
// Sem conexão: um convite discreto para conectar no Perfil.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ResultadoSync } from "@/lib/data/strava";
import { textoCardio } from "@/lib/strava/combinar";

type Estado = { fase: "buscando" } | { fase: "pronto"; r: ResultadoSync } | { fase: "erro"; msg: string };

export function CardioDoTreino({ sessionId }: { sessionId: string }) {
  const [st, setSt] = useState<Estado>({ fase: "buscando" });
  const consultar = useCallback(async (): Promise<Estado> => {
    try {
      const r = await fetch(`/api/strava/sessao/${encodeURIComponent(sessionId)}`, { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as ResultadoSync & { error?: string };
      return r.ok ? { fase: "pronto", r: j } : { fase: "erro", msg: j.error ?? "Não foi possível falar com o Strava agora." };
    } catch {
      return { fase: "erro", msg: "Sem conexão. Tente de novo quando tiver internet." };
    }
  }, [sessionId]);
  useEffect(() => {
    let vivo = true;
    void consultar().then((e) => {
      if (vivo) setSt(e);
    });
    return () => {
      vivo = false;
    };
  }, [consultar]);
  const buscar = async () => {
    setSt({ fase: "buscando" });
    setSt(await consultar());
  };

  if (st.fase === "pronto" && !st.r.conectado) {
    return <Link href="/aluno/perfil#strava" className="block text-center text-xs text-fg-muted underline underline-offset-4">⌚ Treina com relógio? Conecte o Strava e veja seu batimento aqui.</Link>;
  }
  return (
    <section className="space-y-1.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm" aria-label="Batimento do relógio" aria-live="polite">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">❤️ Do seu relógio</p>
      {st.fase === "buscando" ? (
        <p className="text-fg-muted">Buscando seu treino no Strava…</p>
      ) : st.fase === "erro" ? (
        <>
          <p className="text-fg-muted">{st.msg}</p>
          <button type="button" onClick={buscar} className="alvo text-xs font-semibold text-accent underline underline-offset-4">Tentar de novo</button>
        </>
      ) : st.r.conectado && st.r.cardio ? (
        <>
          <p className="font-semibold">{textoCardio(st.r.cardio)}</p>
          <p className="text-xs text-fg-subtle">
            {st.r.cardio.dispositivo ? `${st.r.cardio.dispositivo} · ` : ""}
            <a href={`https://www.strava.com/activities/${st.r.cardio.atividade_id}`} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2" style={{ color: "#FC4C02" }}>Ver no Strava</a>
          </p>
        </>
      ) : (
        <>
          <p className="text-fg-muted">{st.r.conectado ? st.r.motivo : null}</p>
          <button type="button" onClick={buscar} className="alvo text-xs font-semibold text-accent underline underline-offset-4">Buscar de novo</button>
        </>
      )}
    </section>
  );
}
