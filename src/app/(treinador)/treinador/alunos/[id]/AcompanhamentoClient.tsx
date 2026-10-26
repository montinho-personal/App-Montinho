"use client";

// Acompanhamento: pedidos de adaptação (responder) e registro de intervenções
// do treinador (nota, decisão, mensagem visível ao aluno) com autoria e data.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { dataBR } from "@/lib/format";
import type { Adaptacao, Intervencao } from "@/lib/supabase/types-sessoes";

const TIPO_LABEL: Record<Intervencao["tipo"], string> = {
  nota: "Nota interna",
  revisao_treino: "Revisão de treino",
  ajuste_programa: "Ajuste de programa",
  mensagem: "Mensagem ao aluno",
  decisao: "Decisão registrada",
  resposta_adaptacao: "Resposta a pedido",
  contato: "Contato registrado",
};

export function AcompanhamentoClient({ alunoId, adaptacoes, intervencoes }: { alunoId: string; adaptacoes: Adaptacao[]; intervencoes: Intervencao[] }) {
  const router = useRouter();
  const toast = useToast();
  const [resposta, setResposta] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [tipo, setTipo] = useState<Intervencao["tipo"]>("nota");
  const [descricao, setDescricao] = useState("");
  const [visivel, setVisivel] = useState(false);

  async function responder(id: string, status: "respondida" | "resolvida") {
    const texto = (resposta[id] ?? "").trim();
    if (!texto) return toast.warn("Escreva a resposta antes de enviar.");
    setEnviando(id);
    try {
      const res = await fetch(`/api/adaptacoes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resposta: texto, status }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha");
      toast.success("Resposta enviada ao aluno.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao responder");
    } finally {
      setEnviando(null);
    }
  }

  async function registrar() {
    if (!descricao.trim()) return;
    setEnviando("nova");
    try {
      const res = await fetch(`/api/alunos/${alunoId}/intervencoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, descricao: descricao.trim(), visivel_aluno: visivel }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha");
      setDescricao("");
      toast.success("Registrado.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar");
    } finally {
      setEnviando(null);
    }
  }

  const abertas = adaptacoes.filter((a) => a.status === "aberta");
  const fechadas = adaptacoes.filter((a) => a.status !== "aberta");

  return (
    <div className="space-y-4" id="adaptacoes">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos de adaptação {abertas.length ? `· ${abertas.length} em aberto` : ""}</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {adaptacoes.length === 0 ? (
            <p className="px-5 py-6 text-sm text-fg-muted">Nenhum pedido. O aluno pode pedir alternativa em “Não consegui este exercício” durante o treino.</p>
          ) : (
            <ul className="divide-y divide-border">
              {[...abertas, ...fechadas].map((a) => (
                <li key={a.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold">
                      {a.exercicio_nome ?? "Exercício"} · <span className="font-normal text-fg-muted">{a.motivo.replace("_", " ")}</span>
                    </p>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${a.status === "aberta" ? "text-warning" : "text-success"}`}>
                      {a.status} · {dataBR(a.created_at)}
                    </span>
                  </div>
                  {a.descricao ? <p className="text-sm text-fg-muted">“{a.descricao}”</p> : null}
                  {a.status === "aberta" ? (
                    <div className="space-y-2">
                      <textarea value={resposta[a.id] ?? ""} onChange={(e) => setResposta((r) => ({ ...r, [a.id]: e.target.value }))} rows={2} placeholder="Resposta para o aluno (ex.: troque por leg press com amplitude parcial até eu revisar o plano)" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" aria-label="Resposta ao pedido" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" loading={enviando === a.id} onClick={() => responder(a.id, "respondida")}>
                          Responder
                        </Button>
                        <Button size="sm" variant="secondary" loading={enviando === a.id} onClick={() => responder(a.id, "resolvida")}>
                          Responder e marcar resolvido
                        </Button>
                      </div>
                    </div>
                  ) : a.resposta ? (
                    <p className="text-sm border-l-2 border-accent pl-3">{a.resposta}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar intervenção</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Intervencao["tipo"])} className="h-10 rounded-md border border-border bg-bg px-2 text-sm" aria-label="Tipo de intervenção">
              {(["nota", "decisao", "mensagem", "ajuste_programa", "revisao_treino"] as const).map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
              <input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} /> visível para o aluno (com sua assinatura)
            </label>
          </div>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={2000} placeholder="O que você decidiu/observou e por quê. Ex.: reduzi o volume de ombro por desconforto relatado; reavaliar em 2 semanas." className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" aria-label="Descrição da intervenção" />
          <Button size="sm" variant="primary" loading={enviando === "nova"} onClick={registrar} disabled={!descricao.trim()}>
            Registrar
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de intervenções</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {intervencoes.length === 0 ? (
            <p className="px-5 py-6 text-sm text-fg-muted">Nenhuma intervenção registrada. O que não está aqui não aconteceu.</p>
          ) : (
            <ul className="divide-y divide-border">
              {intervencoes.map((i) => (
                <li key={i.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-bold uppercase tracking-wider text-fg-subtle">
                      {TIPO_LABEL[i.tipo]}
                      {i.visivel_aluno ? <span className="ml-2 text-accent normal-case tracking-normal">visível ao aluno</span> : null}
                    </p>
                    <p className="text-[11px] text-fg-subtle">
                      {i.autor?.nome ?? "Treinador"} · {dataBR(i.created_at)}
                    </p>
                  </div>
                  {i.titulo ? <p className="text-sm font-semibold mt-1">{i.titulo}</p> : null}
                  <p className="text-sm text-fg-muted mt-0.5">{i.descricao}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
