"use client";

// Histórico de outro app (resumo por dia, transcrito de prints): conferência
// linha a linha antes de gravar. Repetir o clique não duplica nada.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { dataBR } from "@/lib/format";
import type { LinhaResumo } from "@/lib/historico/resumo";

const kg = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("pt-BR")} kg`);

export function HistoricoResumoCard({ alunoId, importacao, gravadas, diasRegistrados, diasSemSeries }: { alunoId: string; importacao: { id: string; titulo: string; linhas: LinhaResumo[]; avisos: string[] }; gravadas: number; diasRegistrados: number; diasSemSeries: number }) {
  const router = useRouter();
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);
  const validas = importacao.linhas.filter((l) => l.series > 0);
  const [feito, setFeito] = useState(gravadas >= validas.length);
  const dias = new Set(validas.map((l) => l.data)).size;
  const diasComTreino = [...new Set(validas.filter((l) => l.letra).map((l) => l.data))].sort();
  const letraDoDia = (d: string) => validas.find((l) => l.data === d && l.letra)?.letra ?? "";
  const [diasFeito, setDiasFeito] = useState(diasRegistrados >= diasComTreino.length && diasSemSeries === 0);
  const linhas = [...importacao.linhas].sort((a, b) => (a.data === b.data ? a.exercicio.localeCompare(b.exercicio) : a.data < b.data ? -1 : 1));

  async function importar() {
    setEnviando(true);
    const res = await fetch(`/api/alunos/${alunoId}/historico`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importacao_id: importacao.id }) }).catch(() => null);
    setEnviando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível importar.");
    setFeito(true);
    toast.success(d?.novas ? `${d.novas} registro(s) importado(s).` : "Este histórico já estava importado — nada foi duplicado.");
    router.refresh();
  }

  async function contarDias() {
    setEnviando(true);
    const res = await fetch(`/api/alunos/${alunoId}/historico`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importacao_id: importacao.id, acao: "dias" }) }).catch(() => null);
    setEnviando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível registrar os dias.");
    setDiasFeito(true);
    toast.success(d?.novos || d?.seriesCompletadas ? `Dias registrados: ${d.total} · séries: ${d.seriesCompletadas}${d?.conquistas?.length ? ` · conquista: ${d.conquistas.join(", ")}` : ""}.` : "Estes dias já estavam registrados — nada foi duplicado.");
    router.refresh();
  }

  return (
    <Card className={feito ? "border-success/40" : "border-accent/50"}>
      <CardBody className="space-y-3 text-sm">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{feito ? "Histórico importado" : "Histórico pronto para importar"}</p>
          <p className="font-bold">{importacao.titulo}</p>
          <p className="text-xs text-fg-muted">{validas.length} registros · {dias} dias de treino · {new Set(validas.map((l) => l.exercicio)).size} exercícios</p>
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold">Conferir linha a linha</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full">
              <thead className="text-fg-subtle">
                <tr>
                  <th className="py-1 text-left">Data</th>
                  <th className="py-1 text-left">Exercício</th>
                  <th className="py-1 text-right">Séries</th>
                  <th className="py-1 text-right">Carga máx.</th>
                  <th className="py-1 text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={`${l.data}-${l.exercicio}`} className={`border-t border-border ${l.series > 0 ? "" : "text-fg-subtle line-through"}`}>
                    <td className="py-1">{dataBR(l.data)}{l.letra ? ` · ${l.letra}` : ""}</td>
                    <td className="py-1">{l.nomeOriginal}</td>
                    <td className="py-1 text-right font-mono">{l.series}</td>
                    <td className="py-1 text-right font-mono">{kg(l.cargaMax)}</td>
                    <td className="py-1 text-right font-mono">{kg(l.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-fg-subtle">Linha riscada: aparece com 0 séries no app anterior e não é importada. A letra do treino só aparece quando os próprios dados a confirmam.</p>
        </details>
        <ul className="list-disc space-y-1 pl-4 text-xs text-fg-muted">
          {importacao.avisos.map((a) => <li key={a}>{a}</li>)}
        </ul>
        {feito ? (
          <p className="text-xs text-success">Disponível em Evolução › Força e desempenho (marcado com *).</p>
        ) : (
          <button type="button" disabled={enviando} onClick={() => void importar()} className="touch w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-bg disabled:opacity-60">
            {enviando ? "Importando…" : "Importar este histórico"}
          </button>
        )}
        {feito && diasComTreino.length ? (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold">Aderência e conquistas</p>
            <p className="text-xs text-fg-muted">
              Dias com o treino identificado: {diasComTreino.map((d) => `${dataBR(d).slice(0, 5)} (${letraDoDia(d)})`).join(" · ")}.
            </p>
            {diasFeito ? (
              <p className="text-xs text-success">Estes {diasComTreino.length} dias já contam na consistência, no volume semanal, na sequência de semanas e nas conquistas.</p>
            ) : (
              <>
                <p className="text-xs text-fg-subtle">Cada dia vira um treino concluído (marcado como importado), com as séries feitas de cada exercício — sem carga/repetições por série, que o app anterior não mostra.</p>
                <button type="button" disabled={enviando} onClick={() => void contarDias()} className="touch w-full rounded-lg border border-accent px-4 py-2.5 font-bold text-accent disabled:opacity-60">
                  {enviando ? "Registrando…" : `Contar estes ${diasComTreino.length} dias (aderência, volume e conquistas)`}
                </button>
              </>
            )}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
