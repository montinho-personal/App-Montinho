"use client";
// Meta da tribo em destaque (pedido do Montinho, 29/10/2026): anel com a % até
// o próximo troféu coletivo, trilha dos marcos (tocar mostra o detalhe), barras
// dos últimos 7 dias com a parte da pessoa e o ritmo até a meta.
import { useState } from "react";
import Link from "next/link";
import type { DiaTribo, ProximoMarco, SituacaoMarco, Trilha } from "@/lib/tribo/regras";

export type TrilhaMeta = { p: ProximoMarco; marcos: SituacaoMarco[]; ultimos: DiaTribo[]; previsao: number | null; meus: number };

const n = (x: number) => Math.round(x).toLocaleString("pt-BR");
const un = (t: Trilha, x: number) => (t === "cardio" ? `${n(x)} min` : `${n(x)} ${x === 1 ? "treino" : "treinos"}`);
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const rotuloDia = (d: string) => SEMANA[new Date(`${d}T12:00:00Z`).getUTCDay()];

function Anel({ pct }: { pct: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90" aria-hidden>
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-bg" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className="text-accent transition-all duration-700" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(2, pct) / 100)} />
    </svg>
  );
}

export function MetaDaTribo({ cardio, treinos }: { cardio: TrilhaMeta; treinos: TrilhaMeta }) {
  const [trilha, setTrilha] = useState<Trilha>("cardio");
  const t = trilha === "cardio" ? cardio : treinos;
  const proximoIdx = t.marcos.findIndex((m) => !m.alcancadoEm);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [dia, setDia] = useState<number | null>(null);
  const sel = escolhido !== null ? t.marcos[escolhido] : null;
  const max = Math.max(1, ...t.ultimos.map((d) => d.total));
  const semana = t.ultimos.reduce((s, d) => s + d.total, 0);
  const minhaSemana = t.ultimos.reduce((s, d) => s + d.meu, 0);
  const trocar = (x: Trilha) => {
    setTrilha(x);
    setEscolhido(null);
    setDia(null);
  };
  return (
    <section aria-label="Meta da tribo" className="space-y-4 rounded-2xl border-2 border-accent/60 bg-grain-strong p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-accent">🎯 Próxima meta da tribo</h2>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-bg/60 p-1" role="tablist">
        {(["cardio", "treinos"] as const).map((x) => (
          <button key={x} type="button" role="tab" aria-selected={trilha === x} onClick={() => trocar(x)} className={`touch rounded-lg px-2 py-2 text-sm font-bold ${trilha === x ? "bg-accent text-bg" : "text-fg-muted"}`}>
            {x === "cardio" ? "❤️‍🔥 Cardio" : "🏋️ Musculação"}
          </button>
        ))}
      </div>

      {t.p.marco ? (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Anel pct={t.p.pct} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold leading-none">{t.p.pct}%</span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-fg-subtle">do caminho</span>
            </div>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-fg-subtle">Rumo ao troféu</p>
            <p className="text-lg font-extrabold leading-tight text-accent">🏆 {t.p.marco.nome}</p>
            <p className="text-sm">
              <strong>{un(trilha, t.p.total)}</strong> <span className="text-fg-muted">de {un(trilha, t.p.marco.marco)}</span>
            </p>
            <p className="text-sm font-semibold">Faltam {un(trilha, t.p.faltam)}</p>
            {t.previsao ? <p className="text-xs text-fg-muted">⏱️ No ritmo desta semana, a tribo chega lá em ~{t.previsao} {t.previsao === 1 ? "dia" : "dias"}.</p> : null}
          </div>
        </div>
      ) : (
        <p className="text-sm font-semibold text-accent">Todos os marcos desta trilha foram alcançados. Que tribo! 🏆</p>
      )}

      {/* Trilha dos marcos: tocar mostra o detalhe */}
      <div>
        <p className="mb-2 text-xs font-bold text-fg-muted">Trilha dos troféus coletivos <span className="font-normal text-fg-subtle">(toque para ver)</span></p>
        <div className="-mx-1 flex items-center overflow-x-auto px-1 pb-1">
          {t.marcos.map((m, i) => {
            const feito = !!m.alcancadoEm;
            const atual = i === proximoIdx;
            return (
              <div key={m.codigo} className="flex shrink-0 items-center">
                {i > 0 ? <span aria-hidden className={`h-1 w-5 ${feito || atual ? "bg-accent" : "bg-border"}`} /> : null}
                <button
                  type="button"
                  onClick={() => setEscolhido(escolhido === i ? null : i)}
                  aria-label={`${m.nome}: ${feito ? "alcançado" : atual ? `${t.p.pct}% do caminho` : "ainda não"}`}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg ${feito ? "border-accent bg-accent/20" : atual ? "animate-pulse border-accent bg-bg" : "border-border bg-bg opacity-60"} ${escolhido === i ? "ring-2 ring-fg" : ""}`}
                >
                  {feito ? "🏆" : atual ? "🎯" : "🔒"}
                </button>
              </div>
            );
          })}
        </div>
        {sel ? (
          <div className="mt-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <p className="font-bold">{sel.nome} · {un(trilha, sel.marco)}</p>
            <p className="text-xs text-fg-muted">
              {sel.alcancadoEm
                ? `Alcançado em ${new Date(sel.alcancadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. ${sel.participei ? "Você ajudou nesse! 💛" : sel.recuperadoEm ? "Você recuperou esse troféu. 💛" : `Recupere somando ${un(trilha, sel.metaRecuperacao)} no seu ritmo.`}`
                : escolhido === proximoIdx
                  ? `É o próximo: ${t.p.pct}% do caminho, faltam ${un(trilha, t.p.faltam)}. Quem contribuir até lá ganha o troféu.`
                  : `Vem depois. A tribo precisa chegar a ${un(trilha, sel.marco)}.`}
            </p>
          </div>
        ) : null}
      </div>

      {/* Barras: últimos 7 dias, com a parte da pessoa */}
      <div>
        <p className="mb-2 text-xs font-bold text-fg-muted">
          Últimos 7 dias: <span className="text-fg">{un(trilha, semana)}</span> da tribo{minhaSemana ? <> · <span className="text-accent">{un(trilha, minhaSemana)} seus</span></> : null}
        </p>
        <div className="flex h-24 items-end gap-1.5">
          {t.ultimos.map((d, i) => (
            <button key={d.dia} type="button" onClick={() => setDia(dia === i ? null : i)} className="flex h-full flex-1 flex-col items-center justify-end gap-1" aria-label={`${rotuloDia(d.dia)}: ${un(trilha, d.total)}`}>
              <span className={`relative w-full overflow-hidden rounded-t-md ${dia === i ? "bg-fg/40" : "bg-fg/20"}`} style={{ height: `${Math.max(4, (d.total / max) * 100)}%` }}>
                {d.meu ? <span className="absolute inset-x-0 bottom-0 bg-accent" style={{ height: `${(d.meu / Math.max(1, d.total)) * 100}%` }} /> : null}
              </span>
              <span className="text-[10px] text-fg-subtle">{rotuloDia(d.dia)}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-fg-subtle">
          {dia !== null
            ? `${rotuloDia(t.ultimos[dia].dia)} ${t.ultimos[dia].dia.slice(8, 10)}/${t.ultimos[dia].dia.slice(5, 7)}: ${un(trilha, t.ultimos[dia].total)} da tribo${t.ultimos[dia].meu ? `, ${un(trilha, t.ultimos[dia].meu)} seus` : ""}.`
            : "🟨 Dourado = a sua parte. Toque numa barra para ver o dia."}
        </p>
      </div>

      <p className="text-sm">
        💛 Você já somou <strong>{un(trilha, t.meus)}</strong> à tribo.
      </p>
      <Link href={trilha === "cardio" ? "/aluno/cardio" : "/aluno/treinar"} className="touch flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 font-bold text-bg">
        {trilha === "cardio" ? "❤️‍🔥 Somar meu cardio agora" : "💪 Somar meu treino agora"}
      </Link>
    </section>
  );
}
