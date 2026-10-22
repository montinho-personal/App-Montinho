"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { STATUS_LEAD, type Lead, type StatusLead } from "@/lib/visitante/leads";

const dataBR = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const OBJETIVO: Record<string, string> = { hipertrofia: "Massa muscular", emagrecimento: "Emagrecer", condicionamento: "Condicionamento", forca: "Força", saude: "Saúde", outro: "Outro" };

function LinhaLead({ l }: { l: Lead }) {
  const [status, setStatus] = useState<StatusLead>(l.status);
  const [anotacao, setAnotacao] = useState(l.anotacao ?? "");
  const [salvo, setSalvo] = useState<"ok" | "erro" | null>(null);

  async function salvar(novoStatus: StatusLead, nota: string) {
    setSalvo(null);
    const r = await fetch(`/api/treinador/leads/${l.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: novoStatus, anotacao: nota || null }) }).catch(() => null);
    setSalvo(r?.ok ? "ok" : "erro");
  }

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            {l.nome}
            {l.convertido ? <span className="ml-2 rounded-full border border-accent/40 px-2 py-0.5 text-[11px] text-accent">Virou aluno</span> : null}
          </p>
          <p className="text-xs text-fg-muted">
            {l.email ?? "sem e-mail"} · entrou em {dataBR(l.cadastroEm)}
            {l.convite ? ` · convite ${l.convite}` : ""}
            {l.origem ? ` (${l.origem})` : ""}
            {l.desafio ? ` · ${l.desafio}` : ""}
          </p>
          <p className="text-xs text-fg-muted">
            {l.treinosFeitos} {l.treinosFeitos === 1 ? "treino" : "treinos"}
            {l.ultimoTreino ? ` · último em ${dataBR(l.ultimoTreino)}` : ""}
            {l.objetivo ? ` · ${OBJETIVO[l.objetivo] ?? l.objetivo}` : ""}
            {!l.onboarding ? " · boas-vindas pendente" : ""}
          </p>
          {l.whatsapp ? <p className="text-xs font-semibold text-accent">Tocou no WhatsApp: {l.whatsapp.ref} em {dataBR(l.whatsapp.em)}</p> : null}
        </div>
        <select
          value={status}
          onChange={(e) => {
            const v = e.target.value as StatusLead;
            setStatus(v);
            void salvar(v, anotacao);
          }}
          aria-label={`Status de ${l.nome}`}
          className="h-10 rounded-lg border border-border bg-bg px-2 text-sm text-fg"
        >
          {Object.entries(STATUS_LEAD).map(([v, r]) => (
            <option key={v} value={v}>{r}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <input value={anotacao} onChange={(e) => setAnotacao(e.target.value)} onBlur={() => anotacao !== (l.anotacao ?? "") && void salvar(status, anotacao)} placeholder="Anotação (ex.: falou que volta em janeiro)" maxLength={2000} aria-label={`Anotação sobre ${l.nome}`} className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle" />
        {salvo ? <span className={`self-center text-xs ${salvo === "ok" ? "text-success" : "text-danger"}`}>{salvo === "ok" ? "Salvo" : "Erro"}</span> : null}
      </div>
    </li>
  );
}

export function LeadsClient({ leads }: { leads: Lead[] }) {
  const [filtro, setFiltro] = useState<StatusLead | "todos" | "whatsapp">("todos");
  const lista = leads.filter((l) => (filtro === "todos" ? true : filtro === "whatsapp" ? Boolean(l.whatsapp) : l.status === filtro));
  const contagem = (f: typeof filtro) => (f === "todos" ? leads.length : f === "whatsapp" ? leads.filter((l) => l.whatsapp).length : leads.filter((l) => l.status === f).length);
  const filtros: Array<[typeof filtro, string]> = [["todos", "Todos"], ["whatsapp", "Tocaram no WhatsApp"], ...(Object.entries(STATUS_LEAD) as Array<[StatusLead, string]>)];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads</CardTitle>
        <div className="mt-2 flex flex-wrap gap-2">
          {filtros.map(([f, r]) => (
            <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f} className={`min-h-9 rounded-full border px-3 text-xs ${filtro === f ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-muted"}`}>
              {r} ({contagem(f)})
            </button>
          ))}
        </div>
      </CardHeader>
      <CardBody>
        {lista.length ? <ul className="divide-y divide-border">{lista.map((l) => <LinhaLead key={l.id} l={l} />)}</ul> : <p className="text-sm text-fg-muted">Ninguém aqui ainda.</p>}
      </CardBody>
    </Card>
  );
}
