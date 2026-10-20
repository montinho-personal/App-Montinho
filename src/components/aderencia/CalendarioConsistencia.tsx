"use client";

// Calendário de consistência: marcadores por dia (concluído, parcial, extra,
// remanejado, descanso planejado, pausa, previsto). Toque no dia → sessões.

import { useState } from "react";
import type { Dia, SessaoAderencia, TipoDia } from "@/lib/aderencia/calcular";

const MARCA: Record<TipoDia, { rotulo: string; classe: string }> = {
  concluido: { rotulo: "Treino concluído", classe: "bg-success" },
  parcial: { rotulo: "Treino parcial", classe: "bg-warning" },
  remanejado: { rotulo: "Treino remanejado (outro dia)", classe: "bg-info" },
  extra: { rotulo: "Sessão extra", classe: "bg-accent" },
  em_andamento: { rotulo: "Treino não finalizado", classe: "bg-fg-subtle" },
  descanso_planejado: { rotulo: "Descanso planejado", classe: "border border-fg-subtle" },
  pausa: { rotulo: "Pausa combinada", classe: "bg-border-strong" },
  previsto: { rotulo: "Treino previsto", classe: "border border-accent" },
};
const SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function mesesEntre(inicio: string, fim: string): string[] {
  const out: string[] = [];
  let [y, m] = [Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7))];
  const [yf, mf] = [Number(fim.slice(0, 4)), Number(fim.slice(5, 7))];
  while (y < yf || (y === yf && m <= mf)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function CalendarioConsistencia({ dias, sessoes, hoje }: { dias: Record<string, Dia>; sessoes: Record<string, SessaoAderencia>; hoje: string }) {
  const datas = Object.keys(dias).sort();
  const meses = mesesEntre(datas[0] ?? hoje, datas.at(-1) ?? hoje);
  const [idx, setIdx] = useState(() => Math.max(0, meses.indexOf(hoje.slice(0, 7))));
  const [sel, setSel] = useState<string | null>(null);
  const mes = meses[idx] ?? hoje.slice(0, 7);
  const [y, m] = [Number(mes.slice(0, 4)), Number(mes.slice(5, 7))];
  const primeiro = new Date(Date.UTC(y, m - 1, 1));
  const desloc = (primeiro.getUTCDay() + 6) % 7;
  const nDias = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const celulas = [...Array(desloc).fill(null), ...Array.from({ length: nDias }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`)];
  const dia = sel ? dias[sel] : null;
  const nomeMes = primeiro.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <section aria-label="Calendário de consistência" className="space-y-2">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="touch rounded px-2 text-fg-muted disabled:opacity-30" aria-label="Mês anterior">‹</button>
        <p className="text-sm font-semibold capitalize">{nomeMes}</p>
        <button type="button" onClick={() => setIdx((i) => Math.min(meses.length - 1, i + 1))} disabled={idx >= meses.length - 1} className="touch rounded px-2 text-fg-muted disabled:opacity-30" aria-label="Próximo mês">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-fg-subtle">
        {SEMANA.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((d, i) =>
          d ? (
            <button
              key={d}
              type="button"
              onClick={() => setSel(sel === d ? null : d)}
              aria-pressed={sel === d}
              aria-label={`${Number(d.slice(8))} — ${(dias[d]?.tipos ?? []).map((t) => MARCA[t].rotulo).join(", ") || "sem registro"}`}
              className={`flex h-10 flex-col items-center justify-center rounded-md border text-xs ${sel === d ? "border-accent" : "border-transparent"} ${d === hoje ? "font-bold text-accent" : ""} hover:border-border`}
            >
              {Number(d.slice(8))}
              <span className="mt-0.5 flex gap-0.5" aria-hidden>
                {(dias[d]?.tipos ?? []).slice(0, 3).map((t, k) => (
                  <span key={k} className={`h-1.5 w-1.5 rounded-full ${MARCA[t].classe}`} />
                ))}
              </span>
            </button>
          ) : (
            <span key={`v${i}`} />
          )
        )}
      </div>
      {sel ? (
        <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
          <p className="font-semibold">{new Date(`${sel}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p>
          {dia?.sessoes.length ? (
            <ul className="mt-1 space-y-1">
              {dia.sessoes.map((id) => {
                const s = sessoes[id];
                if (!s) return null;
                return (
                  <li key={id} className="text-xs text-fg-muted">
                    <span className="font-semibold text-fg">{s.letra ? `Treino ${s.letra} · ` : ""}{s.nome_treino ?? "Treino"}</span>
                    {s.modo === "extra" ? " · extra" : ""}{s.origem === "treinador" ? " · aula presencial" : ""} · {s.series_concluidas} de {s.series_planejadas} séries
                    {s.duracao_seg ? ` · ${Math.round(s.duracao_seg / 60)} min` : ""}
                    {s.status === "em_andamento" ? " · não finalizado" : s.status === "abandonada" ? " · encerrado antes" : ""}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-fg-muted">{(dia?.tipos ?? []).map((t) => MARCA[t].rotulo).join(", ") || "Nenhum treino registrado neste dia."}</p>
          )}
        </div>
      ) : null}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-fg-subtle" aria-label="Legenda">
        {(Object.keys(MARCA) as TipoDia[]).filter((t) => t !== "em_andamento").map((t) => (
          <li key={t} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${MARCA[t].classe}`} aria-hidden />
            {MARCA[t].rotulo}
          </li>
        ))}
      </ul>
    </section>
  );
}
