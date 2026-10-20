"use client";

// Treinador: meta semanal individual (com histórico) e pausas justificadas.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import type { MetaSemanal, Pausa } from "@/lib/data/aderencia";

const TIPOS: Record<string, string> = { ferias: "Férias", lesao: "Lesão", descanso_prescrito: "Descanso prescrito", viagem: "Viagem", saude: "Saúde", outro: "Outro" };
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export function MetaPausasCard({ alunoId, metaAtual, origem, metas, pausas, hoje }: { alunoId: string; metaAtual: number | null; origem: "personal" | "programa" | null; metas: MetaSemanal[]; pausas: Pausa[]; hoje: string }) {
  const router = useRouter();
  const toast = useToast();
  const [meta, setMeta] = useState(String(metaAtual ?? 3));
  const [desde, setDesde] = useState(hoje);
  const [obs, setObs] = useState("");
  const [p, setP] = useState({ inicio: hoje, fim: "", tipo: "ferias", motivo: "" });
  const [salvando, setSalvando] = useState(false);

  async function enviar(url: string, method: string, body: unknown, ok: string) {
    setSalvando(true);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setSalvando(false);
    const dados = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(dados?.error ?? "Não foi possível salvar.");
    toast.success(ok);
    router.refresh();
  }

  const ordenadas = [...metas].sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1));

  return (
    <div className="space-y-5 text-sm">
      <section className="space-y-2">
        <h3 className="font-semibold">Meta semanal</h3>
        <p className="text-xs text-fg-muted">
          Atual: <strong>{metaAtual ?? "—"}</strong> treino(s)/semana {origem === "programa" ? "(da frequência do programa — defina uma meta própria se quiser)" : origem === "personal" ? "(definida por você)" : ""}. A meta de cada semana é a vigente na segunda-feira; alterações no meio da semana valem a partir da seguinte.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-0.5">
            <span className="block text-[11px] text-fg-muted">Treinos por semana</span>
            <select value={meta} onChange={(e) => setMeta(e.target.value)} className="h-9 rounded-md border border-border bg-bg px-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="space-y-0.5">
            <span className="block text-[11px] text-fg-muted">Vale a partir de</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 rounded-md border border-border bg-bg px-2" />
          </label>
          <input value={obs} onChange={(e) => setObs(e.target.value.slice(0, 300))} placeholder="motivo (opcional)" className="h-9 min-w-40 flex-1 rounded-md border border-border bg-bg px-2" aria-label="Motivo da meta" />
          <button type="button" disabled={salvando} onClick={() => void enviar(`/api/alunos/${alunoId}/meta`, "POST", { meta: Number(meta), vigente_desde: desde, observacao: obs || null }, "Meta salva.")} className="h-9 rounded-md bg-accent px-3 font-bold text-bg disabled:opacity-60">
            Salvar meta
          </button>
        </div>
        {ordenadas.length ? (
          <ul className="text-xs text-fg-subtle">
            {ordenadas.slice(0, 5).map((m) => (
              <li key={m.id}>
                {dataBR(m.vigente_desde)}: {m.meta}/semana{m.observacao ? ` — ${m.observacao}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Pausas combinadas</h3>
        <p className="text-xs text-fg-muted">Férias, lesão, descanso prescrito… Semanas com 4 dias ou mais em pausa não contam na aderência e não quebram a sequência.</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-0.5"><span className="block text-[11px] text-fg-muted">Início</span><input type="date" value={p.inicio} onChange={(e) => setP({ ...p, inicio: e.target.value })} className="h-9 rounded-md border border-border bg-bg px-2" /></label>
          <label className="space-y-0.5"><span className="block text-[11px] text-fg-muted">Fim (opcional)</span><input type="date" value={p.fim} onChange={(e) => setP({ ...p, fim: e.target.value })} className="h-9 rounded-md border border-border bg-bg px-2" /></label>
          <label className="space-y-0.5">
            <span className="block text-[11px] text-fg-muted">Tipo</span>
            <select value={p.tipo} onChange={(e) => setP({ ...p, tipo: e.target.value })} className="h-9 rounded-md border border-border bg-bg px-2">
              {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <input value={p.motivo} onChange={(e) => setP({ ...p, motivo: e.target.value.slice(0, 300) })} placeholder="observação (opcional)" className="h-9 min-w-40 flex-1 rounded-md border border-border bg-bg px-2" aria-label="Observação da pausa" />
          <button type="button" disabled={salvando} onClick={() => void enviar(`/api/alunos/${alunoId}/pausas`, "POST", { inicio: p.inicio, fim: p.fim || null, tipo: p.tipo, motivo: p.motivo || null }, "Pausa registrada.")} className="h-9 rounded-md border border-border px-3 font-semibold text-fg-muted hover:text-fg disabled:opacity-60">
            Registrar pausa
          </button>
        </div>
        {pausas.length ? (
          <ul className="space-y-1 text-xs">
            {[...pausas].sort((a, b) => (a.inicio < b.inicio ? 1 : -1)).slice(0, 8).map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2 text-fg-muted">
                <span className="font-semibold text-fg">{TIPOS[x.tipo] ?? x.tipo}</span>
                {dataBR(x.inicio)} → {x.fim ? dataBR(x.fim) : "em aberto"}
                {x.motivo ? ` · ${x.motivo}` : ""}
                {!x.fim ? (
                  <button type="button" onClick={() => void enviar(`/api/alunos/${alunoId}/pausas`, "PATCH", { pausa_id: x.id, fim: hoje }, "Pausa encerrada.")} className="text-accent underline-offset-2 hover:underline">
                    encerrar hoje
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
