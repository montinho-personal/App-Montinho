"use client";

// Prescrição pronta para este aluno: mostra a auditoria (exercícios, séries,
// posições, bi-sets, pendências) e cadastra com um clique, pelo mesmo
// caminho do montador. Repetir o clique não duplica nada.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import type { TreinoAuditado } from "@/lib/prescricoes/auditar";

export function PrescricaoProntaCard({ alunoId, prescricao, auditoria, pendencias, jaCadastrada }: { alunoId: string; prescricao: { id: string; titulo: string }; auditoria: TreinoAuditado[]; pendencias: string[]; jaCadastrada: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(jaCadastrada);
  const tot = auditoria.reduce((a, t) => ({ ex: a.ex + t.exercicios, se: a.se + t.series, po: a.po + t.posicoes }), { ex: 0, se: 0, po: 0 });

  async function cadastrar() {
    setEnviando(true);
    const res = await fetch(`/api/alunos/${alunoId}/prescricao`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prescricao_id: prescricao.id }) }).catch(() => null);
    setEnviando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível cadastrar.");
    setFeito(true);
    toast.success(d?.jaCadastrada ? "Este treino já estava cadastrado — nada foi duplicado." : `Treino cadastrado (versão ${d?.versao}).`);
    router.refresh();
  }

  return (
    <Card className={feito ? "border-success/40" : "border-accent/50"}>
      <CardBody className="space-y-3 text-sm">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{feito ? "Prescrição cadastrada" : "Prescrição pronta para cadastrar"}</p>
          <p className="font-bold">{prescricao.titulo}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-fg-subtle">
              <tr>
                <th className="py-1 text-left">Treino</th>
                <th className="py-1 text-right">Exercícios</th>
                <th className="py-1 text-right">Séries</th>
                <th className="py-1 text-right">Posições</th>
                <th className="py-1 text-right">Tempo estimado</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {auditoria.map((t) => (
                <tr key={t.letra} className="border-t border-border">
                  <td className="py-1 font-sans">{t.letra} — {t.nome}</td>
                  <td className="py-1 text-right">{t.exercicios}</td>
                  <td className="py-1 text-right">{t.series}</td>
                  <td className="py-1 text-right">{t.posicoes}</td>
                  <td className="py-1 text-right">~{t.estimadoMin} min</td>
                </tr>
              ))}
              <tr className="border-t border-border font-bold">
                <td className="py-1 font-sans">Total</td>
                <td className="py-1 text-right">{tot.ex}</td>
                <td className="py-1 text-right">{tot.se}</td>
                <td className="py-1 text-right">{tot.po}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fg-muted">
          Bi-sets: {auditoria.flatMap((t) => t.bisets.map((b) => `${t.letra}: ${b.exercicios.join(" + ")}`)).join(" · ") || "nenhum"} — 4 rodadas, sem descanso entre os dois; após a rodada, o descanso padrão.
        </p>
        {pendencias.length ? (
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-warning">{pendencias.length} ponto(s) para você confirmar</summary>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-fg-muted">
              {pendencias.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </details>
        ) : null}
        {feito ? (
          <p className="text-xs text-success">Disponível no montador e no app da aluna. Para ajustar, use “Editar no montador”.</p>
        ) : (
          <button type="button" disabled={enviando} onClick={() => void cadastrar()} className="touch w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-bg disabled:opacity-60">
            {enviando ? "Cadastrando…" : auditoria.length === 1 ? "Cadastrar este treino" : `Cadastrar estes ${auditoria.length} treinos`}
          </button>
        )}
        <p className="text-[11px] text-fg-subtle">Cadastro pelo mesmo caminho do montador: cria uma versão nova do plano; treinos anteriores ficam arquivados (nada é apagado). Cargas não são preenchidas.</p>
      </CardBody>
    </Card>
  );
}
