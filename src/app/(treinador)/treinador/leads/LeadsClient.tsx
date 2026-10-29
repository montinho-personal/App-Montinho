"use client";

// Leads reformulado (pedido do Montinho, 29/10/2026): em cima, com quem falar
// agora e por quê (WhatsApp com mensagem pronta); embaixo, todos os leads com
// busca, filtros e o detalhe (situação + anotação) ao tocar na pessoa.
import { useMemo, useState } from "react";
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import { STATUS_LEAD, type Lead, type StatusLead } from "@/lib/visitante/leads";
import { ROTULO_MOTIVO, type Contato } from "@/lib/visitante/leads-prioridade";

const dataBR = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const OBJETIVO: Record<string, string> = { hipertrofia: "Massa muscular", emagrecimento: "Emagrecer", condicionamento: "Condicionamento", forca: "Força", saude: "Saúde", outro: "Outro" };
const COR_STATUS: Record<StatusLead, string> = { novo: "border-border text-fg-muted", em_conversa: "border-accent/60 text-accent", interessado: "border-success/60 text-success", sem_interesse: "border-border text-fg-subtle", virou_aluno: "border-success bg-success/15 text-success" };
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

async function salvarLead(id: string, status: StatusLead, anotacao: string | null): Promise<boolean> {
  const r = await fetch(`/api/treinador/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, anotacao }) }).catch(() => null);
  return !!r?.ok;
}

/** Situação em botões (um toque) — salva na hora. */
function EscolherStatus({ valor, onMudar }: { valor: StatusLead; onMudar: (s: StatusLead) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação">
      {(Object.entries(STATUS_LEAD) as Array<[StatusLead, string]>).map(([v, r]) => (
        <button key={v} type="button" aria-pressed={valor === v} onClick={() => onMudar(v)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${valor === v ? COR_STATUS[v] + " ring-1 ring-current" : "border-border text-fg-subtle"}`}>
          {r}
        </button>
      ))}
    </div>
  );
}

export function FalarAgora({ contatos }: { contatos: Contato[] }) {
  const [feitos, setFeitos] = useState<Record<string, StatusLead>>({});
  const lista = contatos.filter((c) => !feitos[c.lead.id]);
  if (!contatos.length) return <p className="rounded-xl border border-border bg-card p-4 text-sm text-fg-muted">✅ Ninguém esperando agora. Quando alguém pedir para falar com você, estiver com o acesso acabando ou treinando bem sem conversa, aparece aqui.</p>;
  return (
    <ul className="space-y-2">
      {lista.map((c) => {
        const m = ROTULO_MOTIVO[c.motivo];
        return (
          <li key={c.lead.id} className="rounded-xl border border-accent/40 bg-card p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{m.emoji} {m.titulo}</p>
            <p className="mt-0.5 font-semibold">{c.lead.nome}</p>
            <p className="text-xs text-fg-muted">{c.texto}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {c.lead.telefone ? (
                <a href={linkWhatsApp(c.lead.telefone, c.mensagem)} target="_blank" rel="noopener noreferrer" onClick={() => { void salvarLead(c.lead.id, "em_conversa", c.lead.anotacao); setFeitos((f) => ({ ...f, [c.lead.id]: "em_conversa" })); }} className="alvo flex min-h-11 items-center justify-center rounded-lg bg-success px-3 text-sm font-bold text-bg">
                  💬 Chamar no WhatsApp
                </a>
              ) : (
                <span className="flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-xs text-fg-subtle">Sem WhatsApp</span>
              )}
              <button type="button" onClick={() => { void salvarLead(c.lead.id, "sem_interesse", c.lead.anotacao); setFeitos((f) => ({ ...f, [c.lead.id]: "sem_interesse" })); }} className="min-h-11 rounded-lg border border-border px-3 text-xs text-fg-muted">
                Não tem interesse
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-fg-subtle">Ao chamar no WhatsApp, a situação vira “Em conversa” e a pessoa sai desta lista.</p>
          </li>
        );
      })}
      {Object.keys(feitos).length ? <li className="text-xs text-fg-muted">✓ {Object.keys(feitos).length} {Object.keys(feitos).length === 1 ? "pessoa resolvida" : "pessoas resolvidas"} agora.</li> : null}
    </ul>
  );
}

function LinhaLead({ l }: { l: Lead }) {
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState<StatusLead>(l.status);
  const [anotacao, setAnotacao] = useState(l.anotacao ?? "");
  const [salvo, setSalvo] = useState<"ok" | "erro" | null>(null);
  const salvar = async (s: StatusLead, nota: string) => setSalvo((await salvarLead(l.id, s, nota || null)) ? "ok" : "erro");

  return (
    <li>
      <button type="button" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{l.nome}</span>
          <span className="block text-xs text-fg-muted">
            {l.treinosFeitos} {l.treinosFeitos === 1 ? "treino" : "treinos"} · entrou em {dataBR(l.cadastroEm)}
            {l.whatsapp ? " · 💬 tocou no WhatsApp" : ""}
          </span>
        </span>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${COR_STATUS[status]}`}>{STATUS_LEAD[status]}</span>
        <span aria-hidden className="text-fg-subtle">{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto ? (
        <div className="space-y-3 border-t border-border bg-bg/40 px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-fg-subtle">WhatsApp</dt>
            <dd>{l.telefone ? <a href={linkWhatsApp(l.telefone, `Olá, ${l.nome.split(" ")[0]}!`)} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">{l.telefone}</a> : "—"}</dd>
            <dt className="text-fg-subtle">E-mail</dt>
            <dd className="truncate">{l.email ?? "—"}</dd>
            <dt className="text-fg-subtle">Objetivo</dt>
            <dd>{l.objetivo ? (OBJETIVO[l.objetivo] ?? l.objetivo) : "—"}{!l.onboarding ? " (boas-vindas pendente)" : ""}</dd>
            <dt className="text-fg-subtle">Último treino</dt>
            <dd>{dataBR(l.ultimoTreino)}</dd>
            <dt className="text-fg-subtle">Acesso até</dt>
            <dd>{dataBR(l.acessoFim)}</dd>
            <dt className="text-fg-subtle">Veio por</dt>
            <dd>{[l.convite ? `convite ${l.convite}` : null, l.origem, l.desafio].filter(Boolean).join(" · ") || "—"}</dd>
            {l.whatsapp ? (<><dt className="text-fg-subtle">Tocou no WhatsApp</dt><dd>{l.whatsapp.ref} em {dataBR(l.whatsapp.em)}</dd></>) : null}
          </dl>
          <div>
            <p className="mb-1 text-xs font-semibold">Situação</p>
            <EscolherStatus valor={status} onMudar={(s) => { setStatus(s); void salvar(s, anotacao); }} />
          </div>
          <div className="flex gap-2">
            <input value={anotacao} onChange={(e) => setAnotacao(e.target.value)} onBlur={() => anotacao !== (l.anotacao ?? "") && void salvar(status, anotacao)} placeholder="Anotação (ex.: volta em janeiro)" maxLength={2000} aria-label={`Anotação sobre ${l.nome}`} className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle" />
            {salvo ? <span className={`self-center text-xs ${salvo === "ok" ? "text-success" : "text-danger"}`}>{salvo === "ok" ? "Salvo" : "Erro"}</span> : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

type Filtro = StatusLead | "todos" | "whatsapp";

export function LeadsClient({ leads }: { leads: Lead[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [q, setQ] = useState("");
  const passa = (l: Lead, f: Filtro) => (f === "todos" ? true : f === "whatsapp" ? Boolean(l.whatsapp) : l.status === f);
  const lista = useMemo(() => {
    const termos = sem(q).split(/\s+/).filter(Boolean);
    return leads.filter((l) => passa(l, filtro) && termos.every((t) => sem(`${l.nome} ${l.email ?? ""}`).includes(t) || (/^\d+$/.test(t) && (l.telefone ?? "").replace(/\D/g, "").includes(t))));
  }, [leads, filtro, q]);
  const filtros: Array<[Filtro, string]> = [["todos", "Todos"], ["whatsapp", "💬 Tocaram no WhatsApp"], ...(Object.entries(STATUS_LEAD) as Array<[StatusLead, string]>)];
  return (
    <div className="space-y-3">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Buscar por nome, e-mail ou telefone" aria-label="Buscar lead" className="h-12 w-full rounded-xl border border-border bg-card px-4 text-base focus:border-accent focus:outline-none" />
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filtros.map(([f, r]) => (
          <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${filtro === f ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
            {r} ({leads.filter((l) => passa(l, f)).length})
          </button>
        ))}
      </div>
      {lista.length ? <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">{lista.map((l) => <LinhaLead key={l.id} l={l} />)}</ul> : <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-fg-muted">Ninguém aqui.</p>}
    </div>
  );
}
