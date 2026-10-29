"use client";

// “📋 Copiar este protocolo para outro aluno” (pedido do Montinho, 29/10/2026):
// escolhe a pessoa (busca na hora), confirma e pronto — tudo igual, sem as cargas.
import Link from "next/link";
import { useMemo, useState } from "react";
import { bateBusca } from "@/lib/alunos/lista";

type Opcao = { id: string; nome: string; temTreino: boolean };

export function CopiarProtocolo({ alunoId, alunoNome, opcoes, treinos }: { alunoId: string; alunoNome: string; opcoes: Opcao[]; treinos: number }) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [escolhido, setEscolhido] = useState<Opcao | null>(null);
  const [estado, setEstado] = useState<"livre" | "copiando" | "feito">("livre");
  const [erro, setErro] = useState<string | null>(null);
  const lista = useMemo(() => opcoes.filter((o) => bateBusca({ id: o.id, nome: o.nome, email: null, telefone: null, status: "", inicio: null, ultimoTreino: null, acessoAte: null }, q)).slice(0, 40), [opcoes, q]);
  const primeiro = alunoNome.split(" ")[0];

  async function copiar() {
    if (!escolhido) return;
    setEstado("copiando");
    setErro(null);
    const r = await fetch(`/api/alunos/${alunoId}/copiar-protocolo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destino_id: escolhido.id }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { error?: string };
    if (!r?.ok) {
      setEstado("livre");
      setErro(d.error ?? "Não foi possível copiar agora. Tente de novo.");
      return;
    }
    setEstado("feito");
  }

  if (!aberto)
    return (
      <button type="button" onClick={() => setAberto(true)} disabled={!treinos} className="touch mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm disabled:opacity-50">
        <span>
          <span className="block font-semibold">📋 Copiar este protocolo para outro aluno</span>
          <span className="block text-xs text-fg-muted">{treinos ? "Exatamente igual (treinos, exercícios, séries, técnicas), sem as cargas." : "Monte o protocolo primeiro para poder copiar."}</span>
        </span>
        <span aria-hidden className="text-accent">→</span>
      </button>
    );

  return (
    <section className="mt-2 space-y-3 rounded-xl border border-accent/50 bg-card p-4" aria-label="Copiar protocolo">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">📋 Copiar o protocolo de {primeiro}</p>
          <p className="text-xs text-fg-muted">Vai tudo igual, menos as cargas: cada aluno tem as suas.</p>
        </div>
        <button type="button" onClick={() => { setAberto(false); setEscolhido(null); setEstado("livre"); setQ(""); }} className="alvo rounded-md px-2 py-1 text-sm text-fg-muted">✕</button>
      </div>

      {estado === "feito" && escolhido ? (
        <div className="space-y-2 rounded-lg border border-success/50 bg-success/10 p-3 text-sm">
          <p className="font-semibold">✅ Protocolo copiado para {escolhido.nome}!</p>
          <p className="text-xs text-fg-muted">Os treinos que {escolhido.nome.split(" ")[0]} tinha foram arquivados (nada foi apagado). Dá para ajustar o que quiser no montador.</p>
          <Link href={`/treinador/alunos/${escolhido.id}/treinos`} className="alvo inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-bold text-bg">Abrir o montador de {escolhido.nome.split(" ")[0]} →</Link>
        </div>
      ) : escolhido ? (
        <div className="space-y-3">
          <p className="text-sm">
            Copiar para <strong>{escolhido.nome}</strong>?
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-fg-muted">
            <li>Vão os {treinos} {treinos === 1 ? "treino" : "treinos"} de {primeiro}, com exercícios, séries, repetições, descansos, técnicas e divisão.</li>
            <li>As cargas NÃO vão.</li>
            {escolhido.temTreino ? <li>Os treinos atuais de {escolhido.nome.split(" ")[0]} serão arquivados (ficam guardados, nada é apagado).</li> : null}
          </ul>
          {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setEscolhido(null)} className="min-h-11 rounded-lg border border-border text-sm">Voltar</button>
            <button type="button" onClick={() => void copiar()} disabled={estado === "copiando"} className="min-h-11 rounded-lg bg-accent text-sm font-bold text-bg disabled:opacity-50">{estado === "copiando" ? "Copiando…" : "Sim, copiar"}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Para quem? Digite o nome" aria-label="Buscar aluno de destino" className="h-12 w-full rounded-xl border border-border bg-bg px-4 text-base focus:border-accent focus:outline-none" />
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {lista.length ? (
              lista.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => setEscolhido(o)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm">
                    <span className="truncate">{o.nome}</span>
                    <span className="shrink-0 text-xs text-fg-subtle">{o.temTreino ? "já tem treino" : "sem treino"}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-4 text-center text-sm text-fg-muted">Ninguém com esse nome.</li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
