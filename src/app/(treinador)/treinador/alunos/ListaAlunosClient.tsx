"use client";

// Lista de alunos: busca na hora (nome/sobrenome sem acento, e-mail, telefone),
// filtro por status e ordenação (pedido do Montinho, 29/10/2026). Regras em
// src/lib/alunos/lista.ts. Status e ordem ficam no endereço (?status=&ordem=).
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { AlunoStatusPill } from "@/components/ui/StatusPill";
import { bateBusca, ordenarAlunos, ORDENS, type AlunoLista, type Ordem } from "@/lib/alunos/lista";
import type { AlunoStatus } from "@/lib/supabase/types";

export type LinhaAluno = AlunoLista & { avatar: string | null; ultimoTexto: string; acessoTexto: string; dias: number | null };

const FILTROS: Array<{ key: string; label: string }> = [
  { key: "", label: "Todos" },
  { key: "ativo", label: "Ativos" },
  { key: "pendente", label: "Pendentes" },
  { key: "inadimplente", label: "Inadimplentes" },
  { key: "arquivado", label: "Arquivados" },
];

export function ListaAlunosClient({ alunos }: { alunos: LinhaAluno[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const daUrl = params.get("ordem");
  const [ordem, setOrdem] = useState<Ordem>(ORDENS.some((o) => o.id === daUrl) ? (daUrl as Ordem) : "az");
  const campo = useRef<HTMLInputElement>(null);

  const guardar = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v); else p.delete(k);
    router.replace(`?${p.toString()}`, { scroll: false });
  };
  const escolherOrdem = (o: Ordem) => {
    setOrdem(o);
    guardar("ordem", o === "az" ? "" : o);
  };
  const escolherStatus = (s: string) => {
    setStatus(s);
    guardar("status", s);
  };

  const contagem = useMemo(() => {
    const c: Record<string, number> = { "": 0, ativo: 0, pendente: 0, inadimplente: 0, arquivado: 0 };
    for (const a of alunos) {
      c[a.status] = (c[a.status] ?? 0) + 1;
      if (a.status !== "arquivado") c[""]++;
    }
    return c;
  }, [alunos]);

  // Arquivados só aparecem no filtro “Arquivados”.
  const lista = useMemo(() => ordenarAlunos(alunos.filter((a) => (status ? a.status === status : a.status !== "arquivado") && bateBusca(a, q)), ordem), [alunos, status, q, ordem]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">🔎</span>
        <input
          ref={campo}
          type="search"
          inputMode="search"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, sobrenome, e-mail ou telefone"
          aria-label="Buscar aluno"
          className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-base focus:border-accent focus:outline-none"
        />
        {q ? (
          <button type="button" onClick={() => { setQ(""); campo.current?.focus(); }} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-fg-muted">✕</button>
        ) : null}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1" role="group" aria-label="Filtrar por situação">
        {FILTROS.map((f) => (
          <button key={f.key} type="button" aria-pressed={status === f.key} onClick={() => escolherStatus(f.key)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${status === f.key ? "bg-accent text-bg" : "text-fg-muted hover:text-fg"}`}>
            {f.label} <span className="opacity-80">({contagem[f.key] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Ordenar">
        <span className="shrink-0 text-xs text-fg-subtle">Ordenar:</span>
        {ORDENS.map((o) => (
          <button key={o.id} type="button" aria-pressed={ordem === o.id} onClick={() => escolherOrdem(o.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${ordem === o.id ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
            {o.rotulo}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-3 text-base font-bold">{lista.length} {lista.length === 1 ? "aluno" : "alunos"}{q ? ` para “${q}”` : ""}</h2>
        {lista.length === 0 ? (
          <p className="p-8 text-center text-sm text-fg-subtle">Nenhum aluno encontrado. Tente só o começo do nome.</p>
        ) : (
          <ul className="divide-y divide-border">
            {lista.map((a) => (
              <li key={a.id}>
                <Link href={`/treinador/alunos/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-card-hover">
                  <Avatar nome={a.nome || "?"} url={a.avatar} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{a.nome}</span>
                      <AlunoStatusPill status={a.status as AlunoStatus} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-subtle">
                      <span>Último treino {a.ultimoTexto}</span>
                      {ordem === "novos" || ordem === "antigos" ? <span>· desde {a.inicio ? a.inicio.slice(0, 10).split("-").reverse().join("/") : "—"}</span> : null}
                      {ordem === "vence" || (a.dias !== null && a.dias <= 7) ? <span className={a.dias !== null && a.dias < 0 ? "text-red" : a.dias !== null && a.dias <= 7 ? "text-gold" : ""}>· {a.acessoTexto}</span> : null}
                    </div>
                  </div>
                  <span aria-hidden className="text-fg-subtle">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
