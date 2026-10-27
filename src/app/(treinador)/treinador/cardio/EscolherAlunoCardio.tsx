"use client";

// “Prescrever cardio para…”: busca o aluno pelo nome e abre o Treino de cardio dele.
import { useState } from "react";
import Link from "next/link";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function EscolherAlunoCardio({ alunos }: { alunos: Array<{ id: string; nome: string; temCardio: boolean }> }) {
  const [q, setQ] = useState("");
  const lista = alunos.filter((a) => !q.trim() || semAcento(a.nome).includes(semAcento(q.trim()))).slice(0, q.trim() ? 20 : 8);
  return (
    <section className="space-y-2 rounded-xl border border-accent/40 bg-accent/5 p-3">
      <h2 className="font-bold">➕ Prescrever cardio para um aluno</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite o nome do aluno" aria-label="Buscar aluno" className="h-11 w-full rounded-lg border border-border bg-card px-3" />
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {lista.map((a) => (
          <li key={a.id}>
            <Link href={`/treinador/alunos/${a.id}/cardio`} className="touch flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <span className="font-semibold">{a.nome}</span>
              <span className="text-xs text-accent">{a.temCardio ? "Ver cardio →" : "❤️ Prescrever →"}</span>
            </Link>
          </li>
        ))}
        {!lista.length ? <li className="px-3 py-2.5 text-sm text-fg-muted">Ninguém com esse nome.</li> : null}
      </ul>
    </section>
  );
}
