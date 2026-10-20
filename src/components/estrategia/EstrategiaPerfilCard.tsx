"use client";

// Perfil do aluno (personal): estratégia vigente + importar um relatório novo.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { dataBR } from "@/lib/format";
import type { EstrategiaImportada } from "@/lib/estrategia/ler";
import type { FaseAtual } from "@/lib/estrategia/fases";
import { ImportarEstrategia, salvarEstrategiaNoAluno, type Lida } from "./ImportarEstrategia";

export function EstrategiaPerfilCard({ alunoId, vigente, fase, importadaEm }: { alunoId: string; vigente: EstrategiaImportada | null; fase: FaseAtual | null; importadaEm: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [abrir, setAbrir] = useState(!vigente);
  const [lida, setLida] = useState<Lida | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!lida) return;
    setSalvando(true);
    const r = await salvarEstrategiaNoAluno(alunoId, lida);
    setSalvando(false);
    if (!r.ok) return toast.error(r.error ?? "Erro ao salvar.");
    const NOMES: Record<string, string> = { telefone: "WhatsApp", data_nascimento: "nascimento", sexo: "sexo" };
    const cad = r.cadastroAtualizado?.length ? ` Cadastro atualizado: ${r.cadastroAtualizado.map((k) => NOMES[k] ?? k).join(", ")}.` : "";
    toast.success(r.planoCriado ? `Estratégia salva e plano inicial criado (dias por músculo).${cad}` : `Estratégia salva.${r.motivoSemPlano ? ` ${r.motivoSemPlano}` : ""}${cad}`);
    setLida(null);
    setAbrir(false);
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">Estratégia (Montinho Strategy)</p>
            {vigente ? <p className="font-bold">{vigente.titulo ?? "Estratégia"}</p> : <p className="text-fg-muted">Nenhuma estratégia importada.</p>}
          </div>
          {vigente && !abrir ? <button type="button" onClick={() => setAbrir(true)} className="alvo text-xs font-semibold underline">Importar novo relatório</button> : null}
        </div>
        {vigente ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs [overflow-wrap:anywhere] sm:grid-cols-4">
            <dt className="text-fg-subtle">Objetivo</dt><dd>{vigente.objetivo ?? "—"}</dd>
            <dt className="text-fg-subtle">Divisão</dt><dd>{vigente.divisao ?? "—"}</dd>
            <dt className="text-fg-subtle">Intensidade</dt><dd>{vigente.intensidade ?? "—"}</dd>
            <dt className="text-fg-subtle">Fase atual</dt><dd>{fase ? (fase.encerrada ? "Ciclo concluído — hora de reavaliar" : `${fase.fase.nome} · semana ${fase.semana}${fase.semanasFase ? ` de ${fase.semanasFase}` : ""}`) : "—"}</dd>
            <dt className="text-fg-subtle">Prioridades</dt><dd className="sm:col-span-3">{vigente.prioridades.join(", ") || "—"}</dd>
            <dt className="text-fg-subtle">Acompanhamento</dt><dd className="sm:col-span-3">{vigente.checkinSemanal.join(" · ") || "—"}</dd>
            {vigente.adaptacoes ? (<><dt className="text-fg-subtle">Adaptações</dt><dd className="sm:col-span-3">{vigente.adaptacoes}</dd></>) : null}
            {vigente.restricoes ? (<><dt className="text-fg-subtle">Restrições</dt><dd className="sm:col-span-3">{vigente.restricoes}</dd></>) : null}
            {vigente.exerciciosEvitar ? (<><dt className="text-fg-subtle">Evitar</dt><dd className="sm:col-span-3">{vigente.exerciciosEvitar}</dd></>) : null}
            {vigente.exerciciosObrigatorios ? (<><dt className="text-fg-subtle">Obrigatórios</dt><dd className="sm:col-span-3">{vigente.exerciciosObrigatorios}</dd></>) : null}
          </dl>
        ) : null}
        {vigente && importadaEm ? <p className="text-[11px] text-fg-subtle">Importada em {dataBR(importadaEm.slice(0, 10))}{vigente.data ? ` · relatório de ${dataBR(vigente.data)}` : ""}. A aluna/o aluno vê a estratégia em “Sua estratégia”.</p> : null}
        {abrir ? (
          <div className="space-y-2">
            <ImportarEstrategia lida={lida} onLida={setLida} />
            {lida ? (
              <button type="button" disabled={salvando} onClick={() => void salvar()} className="touch w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-bg disabled:opacity-60">
                {salvando ? "Salvando…" : "Salvar estratégia"}
              </button>
            ) : null}
            <p className="text-[11px] text-fg-subtle">Se o aluno ainda não tem treino, o app cria o plano inicial (dias por músculo, metas de séries e frequência) para você escolher os exercícios no montador. Plano existente não é alterado.</p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
