"use client";

import { useEffect, useState } from "react";
import { eventoGa } from "@/components/analytics/ga";
import { mensagemConviteAmigo, REGRAS_INDICACAO } from "@/lib/visitante/campanhas";
import { ESCADA_DESCONTO, REGRAS_DESCONTO } from "@/lib/indicacao/desconto";

/**
 * “Convide um amigo” (0068/0102). Visitante: +10 dias por amigo que cria a
 * conta. Visitante e aluno: 10% de desconto por amigo que FECHA um plano (até
 * 30%). Pede o link pessoal ao abrir e manda pelo WhatsApp.
 */
export function ConviteAmigo({ amigos, diasGanhos, tela, aluno = false }: { amigos: number; diasGanhos: number; tela: "inicio" | "fim_treino" | "indicar"; /** Aluno que já paga: só o desconto (sem os dias grátis). */ aluno?: boolean }) {
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch("/api/visitante/indicacao", { method: "POST" })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { link?: string; error?: string };
        if (!vivo) return;
        if (r.ok && j.link) setLink(j.link);
        else setErro(j.error ?? "Não foi possível gerar o seu convite agora.");
      })
      .catch(() => vivo && setErro("Sem internet para gerar o convite agora."));
    return () => {
      vivo = false;
    };
  }, []);

  const restam = Math.max(0, REGRAS_INDICACAO.maxDias - diasGanhos);
  const texto = link ? mensagemConviteAmigo(link) : "";
  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copie o convite:", texto);
    }
    eventoGa("indicacao_copiar", { tela });
  }

  return (
    <section aria-label="Convide um amigo" className="overflow-hidden rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#2a2415_0%,#171717_70%)] p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Presente para você</p>
      {aluno ? (
        <>
          <h2 className="mt-1 text-2xl font-black leading-tight">
            Indique um amigo e ganhe <span className="text-accent">{REGRAS_DESCONTO.porAmigo}% de desconto</span>
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Seu amigo testa o app 30 dias de graça. Se ele fechar um plano com o Montinho, você ganha {REGRAS_DESCONTO.porAmigo}% de desconto na sua próxima renovação. Indicou mais de um? Os descontos somam até {REGRAS_DESCONTO.maximo}%.
          </p>
        </>
      ) : (
        <>
          <h2 className="mt-1 text-2xl font-black leading-tight">
            Convide um amigo e ganhe <span className="text-accent">+{REGRAS_INDICACAO.diasPorAmigo} dias</span> de app grátis
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Mande o seu link para alguém que também quer treinar. Cada amigo que criar a conta te dá +{REGRAS_INDICACAO.diasPorAmigo} dias, até +{REGRAS_INDICACAO.maxDias} dias.
          </p>
          <p className="mt-2 text-sm font-semibold">🎁 E se o amigo fechar um plano com o Montinho, você ganha desconto em qualquer plano:</p>
        </>
      )}
      <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Quanto você ganha">
        {ESCADA_DESCONTO.map((e) => (
          <li key={e.amigos} className="rounded-xl border border-accent/40 bg-bg/40 px-2 py-2 text-center">
            <span className="block text-xl font-black text-accent">{e.pct}%</span>
            <span className="block text-[11px] text-fg-muted">{e.amigos} {e.amigos === 1 ? "amigo fechou" : "amigos fecharam"}</span>
          </li>
        ))}
      </ol>
      {amigos > 0 && !aluno ? (
        <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">
          🎉 {amigos} {amigos === 1 ? "amigo entrou" : "amigos entraram"} pelo seu convite: você já ganhou +{diasGanhos} dias.{restam ? ` Ainda dá para ganhar +${restam}.` : ""}
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        <a
          href={link ? `https://wa.me/?text=${encodeURIComponent(texto)}` : undefined}
          aria-disabled={!link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => eventoGa("indicacao_whatsapp", { tela })}
          className={`alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg ${link ? "" : "pointer-events-none opacity-60"}`}
        >
          {link ? "Convidar pelo WhatsApp" : "Preparando o seu convite…"}
        </a>
        <button type="button" onClick={() => void copiar()} disabled={!link} className="alvo min-h-11 w-full rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-50">
          {copiado ? "Convite copiado ✓" : "Copiar convite"}
        </button>
      </div>
      {erro ? <p className="mt-2 text-xs text-fg-muted">{erro}</p> : null}
      <p className="mt-3 text-xs text-fg-subtle">{aluno ? "O desconto aparece aqui no app assim que o amigo fechar." : "Os dias entram sozinhos assim que o amigo criar a conta pelo seu link. O desconto aparece aqui quando ele fechar."}</p>
    </section>
  );
}
