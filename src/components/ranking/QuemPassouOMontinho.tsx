"use client";

// “Quem já passou o Montinho?” (pedido do Montinho, 01/11/2026): curiosidade no
// Ranking — fechado mostra só quantos e as iniciais; ao tocar, a lista em ordem
// de chegada (o 1º a passar ganha destaque). Dados da 0140 (`quem_passou_montinho`).
import { useState } from "react";
import type { PassouMontinho } from "@/lib/data/ranking";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
const inicial = (nome: string) => nome.trim().charAt(0).toUpperCase() || "?";

export function QuemPassouOMontinho({ pessoas, personal = false }: { pessoas: PassouMontinho[]; personal?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const n = pessoas.length;
  const euEstou = pessoas.some((p) => p.eu);
  const titulo = n === 0 ? "Ninguém passou o Montinho ainda" : n === 1 ? "1 pessoa já passou o Montinho" : `${n} pessoas já passaram o Montinho`;

  return (
    <section aria-label="Quem já passou o Montinho" className="rounded-2xl border border-accent/60 bg-[linear-gradient(160deg,#2a2415_0%,#171717_80%)] p-4">
      <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className="flex w-full items-center gap-3 text-left">
        <span className="text-4xl" aria-hidden>👑</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">Clube de quem passou o Montinho</span>
          <span className="block font-black leading-snug">{titulo}</span>
          {n > 0 ? (
            <span className="mt-1 flex -space-x-2" aria-hidden>
              {pessoas.slice(0, 6).map((p) => (
                <span key={p.ref} className={`grid h-7 w-7 place-items-center rounded-full border-2 border-bg text-xs font-black ${p.eu ? "bg-accent text-bg" : "bg-[#3a3a3f] text-fg"}`}>{inicial(p.nome)}</span>
              ))}
              {n > 6 ? <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-bg bg-[#3a3a3f] text-[10px] font-bold">+{n - 6}</span> : null}
            </span>
          ) : (
            <span className="block text-xs text-fg-muted">{personal ? "Quando alguém ficar à frente da sua ficha no ranking, aparece aqui." : "Quem vai ser o primeiro? O troféu “Passei o Montinho” está esperando."}</span>
          )}
        </span>
        {n > 0 ? <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-black text-bg">{aberto ? "Fechar" : "Ver quem 👀"}</span> : null}
      </button>

      {aberto && n > 0 ? (
        <div className="mt-3 space-y-2">
          <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-bg/60">
            {pessoas.map((p, i) => (
              <li key={p.ref} className={`flex items-center gap-3 px-3 py-2.5 ${p.eu ? "bg-accent/10" : ""}`}>
                <span className="w-8 shrink-0 text-center text-lg" aria-hidden>{i === 0 ? "🥇" : "👑"}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${p.eu ? "font-black text-accent" : "font-bold"}`}>{p.eu ? `Você (${p.nome})` : p.nome}</span>
                  <span className="block text-[11px] text-fg-muted">{i === 0 ? "O 1º a passar o Montinho · " : ""}passou em {fmt(p.em)}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-fg-muted">
            {personal
              ? "Quem fica à frente da sua ficha no ranking ganha o troféu “Passei o Montinho” e entra aqui. Que tal mandar um parabéns no Celebrar?"
              : euEstou
                ? "Você está no clube! 👑 Mostre para todo mundo no botão “Compartilhar: passei o Montinho!”."
                : "Fique à frente do Montinho em troféus e entre para o clube, com o troféu “Passei o Montinho”."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
