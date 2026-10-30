"use client";

// Ranking do dia do WOD (0134): RX e Scaled em abas separadas (nunca
// misturados), adaptado fora. Mostra “você” em destaque. Quem desligou
// “Aparecer no ranking” no Perfil não aparece para os outros.
import { useState } from "react";
import { rankingDoWod, textoResultado } from "@/lib/modalidades/resultado";
import type { LinhaRankingWod } from "@/lib/data/wod-dia";

export function RankingWod({ linhas, titulo = "🏆 Ranking do dia" }: { linhas: LinhaRankingWod[]; titulo?: string }) {
  const k = rankingDoWod(linhas);
  const [aba, setAba] = useState<"rx" | "scaled">(k.rx.length || !k.scaled.length ? "rx" : "scaled");
  const lista = k[aba];
  const adaptados = linhas.filter((l) => l.condicao === "adaptado").length;
  return (
    <section aria-label="Ranking do dia" className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-black">{titulo}</h2>
        <div className="flex gap-1" role="tablist">
          {(["rx", "scaled"] as const).map((c) => (
            <button key={c} type="button" role="tab" aria-selected={aba === c} onClick={() => setAba(c)} className={`rounded-full px-3 py-1 text-xs font-bold ${aba === c ? "bg-accent text-bg" : "border border-border text-fg-muted"}`}>
              {c === "rx" ? "RX" : "Scaled"} ({k[c].length})
            </button>
          ))}
        </div>
      </div>
      {lista.length ? (
        <ol className="space-y-1">
          {lista.map((l, i) => (
            <li key={`${l.ref}-${i}`} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${l.eu ? "border border-accent/60 bg-accent/10" : ""}`}>
              <span className="w-7 shrink-0 text-center font-black">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{l.eu ? "Você" : l.nome}</span>
              <span className="shrink-0 font-mono text-sm font-bold tabular-nums">{textoResultado(l)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-3 text-center text-sm text-fg-muted">Ninguém anotou {aba === "rx" ? "RX" : "Scaled"} ainda. Seja a primeira pessoa! 🔥</p>
      )}
      <p className="text-[11px] text-fg-subtle">RX e Scaled não se misturam.{adaptados ? ` ${adaptados} ${adaptados === 1 ? "pessoa fez" : "pessoas fizeram"} adaptado: também conta, só não entra na disputa.` : " Adaptado também conta como treino, só não entra na disputa."} Quem não quer aparecer desliga em Perfil.</p>
    </section>
  );
}
