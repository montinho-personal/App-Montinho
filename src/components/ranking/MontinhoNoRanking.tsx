"use client";

// “Você sabia que o Montinho também treina pelo app?” (pedido do Montinho,
// 29/10/2026): cartão-curiosidade no Ranking; ao tocar, revela onde ele
// estaria (sem entrar no ranking) e transforma a curiosidade em ação:
//   • aluno: compartilhar a meta/vitória contra o Montinho (Story com o logo e
//     o @, divulgação) e chamar um amigo (indicação);
//   • visitante: “Quero treinar com o Montinho” (WhatsApp → painel de leads).
import { useState } from "react";
import Link from "next/link";
import { gerarImagemMedalha } from "@/components/chalala/cardMedalha";
import { enviarEvento, enviarEventoComTrofeus } from "@/components/chalala/evento";
import { eventoGa } from "@/components/analytics/ga";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import { compartilharArquivo, MENSAGEM_RESULTADO, type ResultadoCompartilhar } from "@/lib/chalala/compartilhar";
import { nomeDaConquista } from "@/lib/conquistas/conteudo";
import type { MontinhoNoRanking as Dados } from "@/lib/data/ranking";

function baixar(f: File) {
  const url = URL.createObjectURL(f);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function MontinhoNoRanking({ dados, meusTrofeus, minhaPosicao, nome, visitante, whatsapp }: { dados: Dados; meusTrofeus: number | null; minhaPosicao: number | null; nome: string; visitante: boolean; whatsapp: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const dif = meusTrofeus == null ? null : meusTrofeus - dados.trofeus;
  const frente = dif != null && dif > 0;

  async function compartilhar() {
    const titulo = frente ? "PASSEI O MONTINHO!" : "META: PASSAR O MONTINHO";
    const destaque = frente ? `${meusTrofeus} troféus × ${dados.trofeus} do Montinho` : `Faltam ${Math.max(1, -(dif ?? 0) + 1)} troféus para eu passar o Montinho`;
    const card = { selo: frente ? "👑" : "🎯", titulo, destaque, frase: frente ? "Estou na frente do meu personal no ranking!" : "Ele treina pelo app também. Vou passar ele!", porque: "Ranking de troféus do app — Montinho Personal Trainer.", nome: nome.split(" ")[0] ?? "", data: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }), legenda: `${titulo} 🏆 — @montinho_personal` };
    let r: ResultadoCompartilhar;
    try {
      r = await compartilharArquivo(navigator, await gerarImagemMedalha(card), card.legenda, baixar);
    } catch {
      r = "erro";
    }
    eventoGa("montinho_ranking_compartilhar", { resultado: r });
    void enviarEventoComTrofeus({ tipo: r === "baixado" ? "download" : r === "cancelado" ? "compartilhar_cancelado" : "compartilhar_nativo", formato: "stories", origem: "conquistas", ref: "montinho:ranking" });
    if (r !== "enviado_ao_sistema") setAviso(MENSAGEM_RESULTADO[r]);
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => {
          setAberto(true);
          eventoGa("montinho_ranking_aberto", {});
          enviarEvento({ tipo: "montinho_ranking_aberto", origem: "ranking" });
        }}
        className="flex w-full items-center gap-3 rounded-2xl border border-accent/60 bg-[linear-gradient(160deg,#2a2415_0%,#171717_80%)] p-4 text-left"
      >
        <span className="text-4xl" aria-hidden>🕵️</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">Você sabia?</span>
          <span className="block font-black leading-snug">O Montinho também faz todos os treinos aqui pelo app.</span>
          <span className="block text-xs text-fg-muted">Em que lugar ele estaria neste ranking? Quantos troféus ele tem?</span>
        </span>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-black text-bg">Ver 👀</span>
      </button>
    );
  }

  return (
    <section aria-label="Onde o Montinho estaria" className="space-y-3 rounded-2xl border border-accent/60 bg-[linear-gradient(160deg,#2a2415_0%,#171717_80%)] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">O Montinho no ranking</p>
      <p className="text-2xl font-black leading-tight">{dados.posicao ? `Ele estaria em ${dados.posicao}º lugar` : "Ele ainda está começando os troféus"}{dados.posicao ? <span className="text-base font-bold text-fg-muted"> de {dados.total}</span> : null}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border bg-bg/60 p-2"><p className="text-xl font-black">{dados.trofeus}</p><p className="text-[11px] text-fg-muted">troféus</p></div>
        <div className="rounded-xl border border-border bg-bg/60 p-2"><p className="text-xl font-black">{dados.carimbos}</p><p className="text-[11px] text-fg-muted">carimbos</p></div>
        <div className="rounded-xl border border-border bg-bg/60 p-2"><p className="text-xl font-black">{dados.semanas_seguidas}</p><p className="text-[11px] text-fg-muted">semanas seguidas</p></div>
      </div>
      {dados.recentes.length ? <p className="text-xs text-fg-muted">Últimos troféus dele: {dados.recentes.map((c) => nomeDaConquista(c)).join(" · ")}</p> : null}
      {dif != null ? (
        <p className="rounded-xl bg-bg/60 px-3 py-2 text-sm font-semibold">
          {frente ? `👑 Você está ${dif} ${dif === 1 ? "troféu" : "troféus"} na frente do seu personal!` : dif === 0 ? "⚔️ Vocês estão empatados em troféus. Quem cumprir a meta da semana passa na frente!" : `🎯 Faltam ${-dif + 1} ${-dif + 1 === 1 ? "troféu" : "troféus"} para você passar o Montinho.`}
          {minhaPosicao && dados.posicao ? <span className="block text-xs font-normal text-fg-muted">Você: {minhaPosicao}º · Montinho: {dados.posicao}º (ele fica fora do ranking oficial)</span> : null}
        </p>
      ) : null}
      {visitante ? (
        <>
          <p className="text-sm">Ele faz o que ensina. Quer treinar com acompanhamento de perto?</p>
          {whatsapp ? <FalarComMontinho origem="consultoria" whatsapp={whatsapp} visitante texto="💬 Quero treinar com o Montinho" /> : null}
        </>
      ) : (
        <button type="button" onClick={() => void compartilhar()} className="touch w-full rounded-xl bg-accent px-4 py-3 font-black text-bg">
          📲 {frente ? "Compartilhar: passei o Montinho!" : "Compartilhar: vou passar o Montinho"}
        </button>
      )}
      {aviso ? <p className="text-xs text-fg-muted">{aviso}</p> : null}
      <Link href="/aluno/indicar" className="flex items-center justify-between gap-2 rounded-xl border border-border bg-bg/60 px-3 py-2.5 text-sm">
        <span>🎁 <b>Chame um amigo</b> para tentar passar o Montinho também</span>
        <span aria-hidden className="text-accent">→</span>
      </Link>
      <p className="text-[11px] text-fg-subtle">O Montinho treina com as mesmas regras de troféus, mas não entra no ranking: o pódio é de vocês.</p>
    </section>
  );
}
