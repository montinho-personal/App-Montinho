"use client";
// Avisos de evolução do aluno (decisão do personal; o aluno ainda pode reduzir).
import { useState } from "react";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { useToast } from "@/components/ui/Toast";
import type { ConfigEvolucao, MetricaEvolucao } from "@/lib/data/evolucao";

const METRICAS: Array<[MetricaEvolucao, string]> = [["recorde", "Recordes"], ["mais_carga", "Mais carga"], ["mais_reps", "Mais repetições"], ["acima_media", "Acima da média"]];

export function ConfigEvolucaoAluno({ alunoId, inicial }: { alunoId: string; inicial: ConfigEvolucao }) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [c, setC] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    setSalvando(true);
    const res = await fetch(`/api/alunos/${alunoId}/evolucao-config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }).catch(() => null);
    setSalvando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível salvar.");
    toast.success("Avisos de evolução atualizados.");
    setAberto(false);
  }
  if (!aberto) return <button type="button" onClick={() => setAberto(true)} className="alvo text-fg-muted underline-offset-2 hover:underline">Avisos no treino: {c.avisos_ativos ? `ligados (até ${c.max_por_sessao})` : "desligados"} · Vai que tá fácil: {c.vai_que_ta_facil ? "ligado" : "desligado"}</button>;
  return (
    <div className="w-full space-y-2 rounded-lg border border-border p-3 text-xs">
      <label className="flex items-center gap-2"><input type="checkbox" checked={c.avisos_ativos} onChange={(e) => setC({ ...c, avisos_ativos: e.target.checked })} /> Avisos de evolução durante o treino</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={c.vai_que_ta_facil} onChange={(e) => setC({ ...c, vai_que_ta_facil: e.target.checked })} /> “Vai que tá fácil!” na última série (quando as anteriores saíram fáceis)</label>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1">Por exercício <CampoNumero min={0} max={5} valor={c.max_por_exercicio} onChange={(v) => setC({ ...c, max_por_exercicio: v })} className="w-12 rounded border border-border bg-bg px-1" aria-label="Avisos por exercício" /></label>
        <label className="flex items-center gap-1">Por treino <CampoNumero min={0} max={10} valor={c.max_por_sessao} onChange={(v) => setC({ ...c, max_por_sessao: v })} className="w-12 rounded border border-border bg-bg px-1" aria-label="Avisos por treino" /></label>
      </div>
      <div className="flex flex-wrap gap-3">
        {METRICAS.map(([k, r]) => (
          <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={c.metricas.includes(k)} onChange={(e) => setC({ ...c, metricas: e.target.checked ? [...c.metricas, k] : c.metricas.filter((x) => x !== k) })} /> {r}</label>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={salvando} onClick={() => void salvar()} className="rounded-md bg-accent px-3 py-1.5 font-bold text-bg disabled:opacity-60">{salvando ? "Salvando…" : "Salvar"}</button>
        <button type="button" onClick={() => { setC(inicial); setAberto(false); }} className="rounded-md border border-border px-3 py-1.5">Cancelar</button>
      </div>
    </div>
  );
}
