"use client";

// Perfil do aluno: conectar o relógio pelo Strava. Pede o consentimento
// explícito (batimento é dado de saúde) e mostra os últimos treinos com
// batimento. Desconectar a qualquer momento.
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CardioSessao, StatusStrava } from "@/lib/data/strava";
import { textoCardio } from "@/lib/strava/combinar";

const LARANJA = "#FC4C02";
const dia = (iso: string | null) => (iso ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(iso)) : "");

const AVISOS: Record<string, string> = {
  ok: "Strava conectado! Você ganhou o troféu ⌚ Relógio no Pulso. No fim de cada treino, o app busca o batimento do relógio, e seus cardios aparecem em Evolução.",
  negado: "Você não autorizou no Strava. Quando quiser, é só tentar de novo.",
  escopo: "Para achar seus treinos, deixe marcada no Strava a opção de ver as atividades (inclusive as privadas).",
  erro: "Não foi possível conectar agora. Tente de novo em instantes.",
  consentimento: "Marque a autorização para conectar.",
  indisponivel: "A conexão com o Strava ainda está sendo ativada pelo Montinho. Volte em breve!",
};

export function ConectarStrava({ status, ultimos, aviso }: { status: StatusStrava; ultimos: CardioSessao[]; aviso: string | null }) {
  const [aceito, setAceito] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const router = useRouter();
  async function desconectar() {
    if (!confirm("Desconectar o Strava? Os batimentos já importados continuam no histórico.")) return;
    setSaindo(true);
    await fetch("/api/strava/desconectar", { method: "POST" }).catch(() => undefined);
    setSaindo(false);
    router.replace("/aluno/perfil#strava");
    router.refresh();
  }
  return (
    <section id="strava" className="space-y-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm" aria-label="Relógio e Strava">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-lg">⌚</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Relógio (pelo Strava)</p>
          <p className="text-xs text-fg-muted">Garmin, Apple Watch, Polar, Coros, Samsung, Amazfit… Se o seu relógio manda o treino para o Strava, o app mostra seu batimento em cada treino e traz seus cardios (corrida, bike, caminhada…). Conectar vale o troféu ⌚ Relógio no Pulso!</p>
        </div>
      </div>
      {aviso && AVISOS[aviso] ? <p className={`rounded-lg px-3 py-2 text-xs ${aviso === "ok" ? "bg-accent/15 text-fg" : "bg-bg text-fg-muted"}`} role="status">{AVISOS[aviso]}</p> : null}
      {status.conectado ? (
        <>
          <p className="text-xs">✅ Conectado{status.atleta ? ` como ${status.atleta}` : ""}{status.desde ? ` desde ${dia(status.desde)}` : ""}.</p>
          {ultimos.length ? (
            <ul className="space-y-1 text-xs">
              {ultimos.map((c) => (
                <li key={c.session_id} className="flex justify-between gap-2 border-t border-border pt-1">
                  <span className="text-fg-muted">{dia(c.inicio_atividade)}</span>
                  <span className="text-right">❤️ {textoCardio(c)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-fg-muted">Ainda sem treinos com batimento. Treine com o relógio e termine o treino no app.</p>
          )}
          <button type="button" onClick={desconectar} disabled={saindo} className="alvo text-xs font-semibold text-fg-muted underline underline-offset-4 disabled:opacity-50">{saindo ? "Desconectando…" : "Desconectar o Strava"}</button>
        </>
      ) : (
        <>
          <label className="flex items-start gap-2 text-xs text-fg-muted">
            <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
            <span>Autorizo o app a importar do Strava os dados das minhas atividades (batimento cardíaco, duração, distância e calorias, inclusive dos cardios como corrida e bike) para o acompanhamento com o Montinho. São dados de saúde: o Montinho vê, e mais ninguém. Posso desconectar quando quiser (<a href="/privacidade" target="_blank" className="underline">privacidade</a>).</span>
          </label>
          <a
            href={aceito ? "/api/strava/conectar?consentimento=1" : undefined}
            aria-disabled={!aceito}
            onClick={(e) => { if (!aceito) e.preventDefault(); }}
            className={`touch flex items-center justify-center gap-2 rounded-xl px-4 font-bold text-white ${aceito ? "" : "pointer-events-none opacity-40"}`}
            style={{ backgroundColor: LARANJA }}
          >
            Conectar com o Strava
          </a>
        </>
      )}
      <p className="text-[10px] text-fg-subtle">Compatível com o Strava. Strava é marca da Strava, Inc.</p>
    </section>
  );
}
