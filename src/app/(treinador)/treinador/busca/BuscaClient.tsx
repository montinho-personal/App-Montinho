"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { alunosParecidos, buscarAlunos, type AlunoIndice } from "@/lib/busca/alunos";

const STATUS: Record<string, string> = { ativo: "Ativo", pendente: "Pendente", inadimplente: "Inadimplente", pausado: "Pausado", arquivado: "Arquivado" };

function Etiquetas({ a }: { a: AlunoIndice }) {
  return (
    <span className="flex flex-wrap gap-1.5 text-[11px]">
      {a.modalidade === "visitante" ? <span className="rounded-full border border-accent/40 px-2 py-0.5 text-accent">Visitante</span> : null}
      {a.status !== "ativo" ? <span className="rounded-full border border-border px-2 py-0.5 text-fg-muted">{STATUS[a.status] ?? a.status}</span> : null}
      {a.programa?.nome ? <span className="rounded-full border border-border px-2 py-0.5 text-fg-muted">{a.programa.nome}</span> : null}
    </span>
  );
}

export function BuscaClient({ alunos, inicial }: { alunos: AlunoIndice[]; inicial: string }) {
  const [q, setQ] = useState(inicial);
  const [base, setBase] = useState<AlunoIndice | null>(null);
  const resultados = useMemo(() => buscarAlunos(alunos, q), [alunos, q]);
  const parecidos = useMemo(() => (base ? alunosParecidos(base, alunos) : []), [base, alunos]);
  const porNome = resultados.filter((r) => r.tipo === "nome");
  const porEstrutura = resultados.filter((r) => r.tipo === "estrutura");

  const linkAluno = (a: AlunoIndice) => (a.modalidade === "visitante" ? "/treinador/visitantes" : `/treinador/alunos/${a.id}`);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Buscar</h1>
        <p className="mt-1 text-sm text-fg-muted">Digite o nome ou sobrenome do aluno, ou uma parte do treino: exercício, nome do programa, divisão ou técnica (ex.: “remada cavalinho”, “upper lower”, “bi-set”).</p>
      </header>
      <div className="relative">
        <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setBase(null);
          }}
          autoFocus
          placeholder="Nome, sobrenome ou algo do treino…"
          aria-label="Buscar aluno ou estrutura de treino"
          className="h-12 w-full rounded-xl border border-border bg-bg pl-11 pr-4 text-base text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {base ? (
        <section className="space-y-3" aria-label="Alunos com treino parecido">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Treino parecido com o de {base.nome.split(" ")[0]}</h2>
            <button type="button" onClick={() => setBase(null)} className="alvo text-sm text-accent underline-offset-2 hover:underline">Voltar à busca</button>
          </div>
          {parecidos.length ? (
            <ul className="space-y-2">
              {parecidos.map((p) => (
                <li key={p.aluno.id}>
                  <Link href={linkAluno(p.aluno)} className="block rounded-xl border border-border bg-card p-3 hover:border-accent/40">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{p.aluno.nome}</span>
                      <span className="text-sm font-semibold text-accent">{Math.round(p.semelhanca * 100)}% parecido</span>
                    </span>
                    <span className="mt-1 block text-xs text-fg-muted">Em comum: {p.comuns.slice(0, 6).join(", ")}{p.comuns.length > 6 ? "…" : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">Nenhum aluno com pelo menos 20% dos exercícios em comum.</p>
          )}
        </section>
      ) : q.trim() ? (
        <>
          {resultados.length === 0 ? <p className="text-sm text-fg-muted">Nada encontrado para “{q}”. Tente só o primeiro nome, um sobrenome ou o nome de um exercício.</p> : null}
          {porNome.length ? (
            <section className="space-y-2" aria-label="Alunos pelo nome">
              <h2 className="text-xs font-bold uppercase tracking-wider text-fg-subtle">Pelo nome</h2>
              <ul className="space-y-2">
                {porNome.map((r) => (
                  <li key={r.aluno.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                    <Link href={linkAluno(r.aluno)} className="min-w-0 flex-1">
                      <span className="block font-semibold">{r.aluno.nome}</span>
                      <Etiquetas a={r.aluno} />
                    </Link>
                    {r.aluno.treinos.length ? (
                      <button type="button" onClick={() => setBase(r.aluno)} className="alvo shrink-0 rounded-lg border border-border px-3 py-2 text-xs text-fg-muted hover:border-accent/40">Treino parecido</button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {porEstrutura.length ? (
            <section className="space-y-2" aria-label="Alunos pela estrutura do treino">
              <h2 className="text-xs font-bold uppercase tracking-wider text-fg-subtle">Pelo treino ({porEstrutura.length})</h2>
              <ul className="space-y-2">
                {porEstrutura.map((r) => (
                  <li key={r.aluno.id} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
                    <Link href={linkAluno(r.aluno)} className="min-w-0 flex-1">
                      <span className="block font-semibold">{r.aluno.nome}</span>
                      <span className="mt-1 block text-xs text-fg-muted">{r.motivos.slice(0, 3).join(" · ")}{r.motivos.length > 3 ? ` · +${r.motivos.length - 3}` : ""}</span>
                    </Link>
                    <button type="button" onClick={() => setBase(r.aluno)} className="alvo shrink-0 rounded-lg border border-border px-3 py-2 text-xs text-fg-muted hover:border-accent/40">Treino parecido</button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-fg-subtle">{alunos.length} pessoas para buscar.</p>
      )}
    </div>
  );
}
