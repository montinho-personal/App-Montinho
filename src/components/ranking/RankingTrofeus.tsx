"use client";

// Ranking de troféus: pódio (ouro, prata, bronze) + lista. Mostra só o nome
// que a função do banco devolve (primeiro nome e inicial para os alunos).
// Tocar no nome abre o perfil (troféus, desempate, desafiar e cutucar — 0117).
import { useState } from "react";
import Link from "next/link";
import { PerfilRankingSheet } from "./PerfilRankingSheet";
import { DESEMPATE, PODIO, podioDaPosicao, type LinhaRanking } from "@/lib/ranking/trofeus";

const ALTURA: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-14" };

function Degrau({ posicao, linhas }: { posicao: 1 | 2 | 3; linhas: LinhaRanking[] }) {
  const p = PODIO[podioDaPosicao(posicao)!];
  const doLugar = linhas.filter((l) => l.posicao === posicao);
  const principal = doLugar.find((l) => l.eu) ?? doLugar[0];
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
      {principal ? (
        <>
          <span className={`text-3xl ${posicao === 1 ? "motion-safe:animate-[pulse_2.5s_ease-in-out_infinite]" : ""}`} aria-hidden>{p.emoji}</span>
          <span className={`max-w-full truncate text-center text-sm font-bold ${principal.eu ? "text-accent" : ""}`}>{principal.eu ? "Você" : principal.nome}</span>
          {doLugar.length > 1 ? <span className="text-[10px] text-fg-subtle">+{doLugar.length - 1} empatado{doLugar.length > 2 ? "s" : ""}</span> : null}
          <span className="font-mono text-xs text-fg-muted">{principal.trofeus} 🏆</span>
        </>
      ) : null}
      <div className={`w-full rounded-t-lg ${ALTURA[posicao]} flex items-start justify-center pt-1 text-lg font-black text-bg`} style={{ background: `linear-gradient(180deg, ${p.cor}, ${p.cor}99)` }}>
        {posicao}º
      </div>
    </div>
  );
}

export function RankingTrofeus({ linhas, nomeCompleto = false, desafiar = false }: { linhas: LinhaRanking[]; nomeCompleto?: boolean; desafiar?: boolean }) {
  const [aberto, setAberto] = useState<LinhaRanking | null>(null);
  if (!linhas.length) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Ainda ninguém tem troféus. O primeiro a conquistar já sai na frente!</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-3 pt-4" aria-label="Pódio">
        <Degrau posicao={2} linhas={linhas} />
        <Degrau posicao={1} linhas={linhas} />
        <Degrau posicao={3} linhas={linhas} />
      </div>
      <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface" aria-label="Classificação">
        {linhas.map((l, i) => {
          const p = podioDaPosicao(l.posicao);
          return (
            <li key={`${l.posicao}-${l.nome}-${i}`} aria-current={l.eu ? "true" : undefined} className={`flex items-center gap-3 px-3 py-2.5 ${l.eu ? "bg-accent/10" : ""}`}>
              <span className="w-12 shrink-0 text-center font-mono text-sm font-bold" style={p ? { color: PODIO[p].cor } : undefined}>{p ? <>{PODIO[p].emoji} {l.posicao}º</> : `${l.posicao}º`}</span>
              {l.ref ? (
                <button type="button" onClick={() => setAberto(l)} className={`alvo min-w-0 flex-1 truncate text-left text-sm underline-offset-4 hover:underline ${l.eu ? "font-bold text-accent" : "font-semibold"}`} aria-label={`Ver perfil de ${l.eu ? "você" : l.nome}: troféus e desempate`}>
                  {l.eu ? `Você${nomeCompleto ? "" : ` (${l.nome})`}` : l.nome}
                  {nomeCompleto && l.visitante ? <span className="ml-1.5 rounded-full border border-border px-1.5 text-[10px] font-normal text-fg-subtle">visitante</span> : null}
                  <span aria-hidden className="ml-1 text-[10px] text-fg-subtle">›</span>
                </button>
              ) : (
                <span className={`min-w-0 flex-1 truncate text-sm ${l.eu ? "font-bold text-accent" : "font-semibold"}`}>
                  {l.eu ? `Você${nomeCompleto ? "" : ` (${l.nome})`}` : l.nome}
                  {nomeCompleto && l.visitante ? <span className="ml-1.5 rounded-full border border-border px-1.5 text-[10px] font-normal text-fg-subtle">visitante</span> : null}
                </span>
              )}
              {desafiar && !l.eu ? (
                <Link href={`/aluno/desafios/novo?com=${encodeURIComponent(l.nome)}`} className="alvo shrink-0 rounded-full border border-accent/60 px-2.5 py-1 text-xs font-bold text-accent" aria-label={`Desafiar ${l.nome}`}>
                  ⚔️ Desafiar
                </Link>
              ) : null}
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm">{l.trofeus}{l.mesmoTotalAcima ? <span className="text-fg-subtle" title="Empate em troféus: decidido pelo desempate">*</span> : null} <span aria-label={l.trofeus === 1 ? "troféu" : "troféus"}>🏆</span></span>
                {l.aderenciaSemana != null ? <span className="block text-[10px] text-fg-subtle">semana {l.aderenciaSemana}%</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      {linhas.some((l) => l.ref) ? <p className="text-[11px] text-fg-subtle">👆 Toque no nome para ver os troféus, o desempate{desafiar ? ", desafiar e cutucar" : ""}.</p> : null}
      <p className="text-[11px] leading-relaxed text-fg-subtle">{DESEMPATE}</p>
      {aberto?.ref ? <PerfilRankingSheet refPessoa={aberto.ref} nome={aberto.nome} posicao={aberto.posicao} interagir={desafiar} onFechar={() => setAberto(null)} /> : null}
    </div>
  );
}
