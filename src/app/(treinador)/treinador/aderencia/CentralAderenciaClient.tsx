"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ordenarCentral, type LinhaCentral, type OrdemCentral } from "@/lib/aderencia/central";
import { dataLocal } from "@/lib/aderencia/calcular";

const ORDENS: Array<{ v: OrdemCentral; l: string }> = [
  { v: "queda", l: "Maior redução de frequência" },
  { v: "tempo_sem_treino", l: "Mais tempo sem treinar" },
  { v: "melhora", l: "Melhor evolução de aderência" },
  { v: "retomaram", l: "Retornaram recentemente" },
  { v: "nome", l: "Nome" },
];
const COR = { acompanhar: "border-warning/50 text-warning", reconhecer: "border-success/50 text-success", info: "border-border text-fg-muted" } as const;
const dataBR = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "—");
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function CentralAderenciaClient({ linhas }: { linhas: LinhaCentral[] }) {
  const [ordem, setOrdem] = useState<OrdemCentral>("queda");
  const [soSinais, setSoSinais] = useState(false);
  const lista = useMemo(() => ordenarCentral(soSinais ? linhas.filter((l) => l.sinais.some((s) => s.natureza !== "info")) : linhas, ordem), [linhas, ordem, soSinais]);
  const acompanhar = linhas.filter((l) => l.sinais.some((s) => s.natureza === "acompanhar")).length;
  const reconhecer = linhas.filter((l) => l.sinais.some((s) => s.natureza === "reconhecer")).length;

  if (!linhas.length) return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">Nenhum aluno ativo ainda.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-warning/50 px-3 py-1 text-warning">{acompanhar} para acompanhar</span>
        <span className="rounded-full border border-success/50 px-3 py-1 text-success">{reconhecer} para reconhecer</span>
        <select aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemCentral)} className="ml-auto h-9 rounded-md border border-border bg-bg px-2 text-sm">
          {ORDENS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <input type="checkbox" checked={soSinais} onChange={(e) => setSoSinais(e.target.checked)} /> só com sinais
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-wider text-fg-subtle">
            <tr>
              <th className="px-3 py-2 text-left">Aluno</th>
              <th className="px-2 py-2 text-right">Meta</th>
              <th className="px-2 py-2 text-right">Semana</th>
              <th className="px-2 py-2 text-right" title="Últimas 4 semanas completas">Aderência 28d</th>
              <th className="px-2 py-2 text-right" title="Diferença para as 4 semanas anteriores">Tendência</th>
              <th className="px-2 py-2 text-right">Último treino</th>
              <th className="px-2 py-2 text-right">Próximo previsto</th>
              <th className="px-3 py-2 text-left">Acompanhamento</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => (
              <tr key={l.alunoId} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <Link href={`/treinador/alunos/${l.alunoId}`} className="font-semibold hover:text-accent">{l.nome}</Link>
                </td>
                <td className="px-2 py-2 text-right font-mono">{l.meta ?? "—"}</td>
                <td className="px-2 py-2 text-right font-mono">{l.meta ? `${num(l.semanaPontos)}/${l.meta}` : "—"}</td>
                <td className="px-2 py-2 text-right font-mono">{l.aderencia28 === null ? "—" : `${l.aderencia28}%`}</td>
                <td className={`px-2 py-2 text-right font-mono ${l.tendencia === null ? "" : l.tendencia < 0 ? "text-warning" : l.tendencia > 0 ? "text-success" : ""}`}>{l.tendencia === null ? "—" : `${l.tendencia > 0 ? "+" : ""}${l.tendencia}`}</td>
                <td className="px-2 py-2 text-right font-mono">{l.ultimaSessao ? `${dataBR(dataLocal(l.ultimaSessao))}${l.diasDesdeUltima !== null ? ` (${l.diasDesdeUltima}d)` : ""}` : "—"}</td>
                <td className="px-2 py-2 text-right font-mono">{dataBR(l.proximaPrevista)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {l.sinais.map((s) => (
                      <span key={s.tipo} className={`rounded-full border px-2 py-0.5 text-[11px] ${COR[s.natureza]}`}>{s.texto}</span>
                    ))}
                    {l.sinais.some((s) => s.natureza !== "info") ? (
                      <Link href={`/treinador/alunos/${l.alunoId}#acompanhamento`} className="text-[11px] text-accent underline-offset-2 hover:underline">enviar mensagem</Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-fg-subtle">Sinais: 10+ dias sem registrar treino (fora de pausa), aderência 20+ pontos abaixo das 4 semanas anteriores, retorno após 14+ dias, 4+ semanas seguidas com a meta. Nenhuma mensagem é enviada automaticamente.</p>
    </div>
  );
}
