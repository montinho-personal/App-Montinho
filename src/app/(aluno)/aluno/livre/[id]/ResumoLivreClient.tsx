"use client";

// Fim do treino livre: o que foi feito e “Salvar como treino” (vai para Meus
// treinos, para repetir ou ajustar depois).
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { treinoDoLivre, type ExercicioLivre, type ResumoLivre } from "@/lib/treino/livre";

const kg = (n: number) => `${n.toLocaleString("pt-BR")} kg`;

export function ResumoLivreClient({ resumo, exercicios, podeSalvar, duracaoMin, extra = false, dentroDoFim = false }: { resumo: ResumoLivre; exercicios: ExercicioLivre[]; podeSalvar: boolean; duracaoMin: number | null; extra?: boolean; /** Dentro da tela de fim comum (TelaChalala): sem título nem botões próprios. */ dentroDoFim?: boolean }) {
  const [nome, setNome] = useState(`Treino livre ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`);
  const [estado, setEstado] = useState<"pronto" | "salvando" | "salvo">("pronto");
  const [erro, setErro] = useState<string | null>(null);
  const paraSalvar = treinoDoLivre(exercicios);

  async function salvar() {
    setEstado("salvando");
    setErro(null);
    const r = await fetch("/api/visitante/treinos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: null, nome: nome.trim(), exercicios: paraSalvar }) }).catch(() => null);
    if (r?.ok) return setEstado("salvo");
    const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setErro(j?.error ?? "Não foi possível salvar agora.");
    setEstado("pronto");
  }

  return (
    <div className="space-y-4">
      {dentroDoFim ? null : <section className="space-y-1 rounded-xl border border-accent/50 bg-grain-strong p-4 text-center">
        <p className="text-4xl" aria-hidden>🎲</p>
        <h1 className="text-2xl font-bold">{extra ? "Treino extra livre concluído!" : "Treino livre concluído!"}</h1>
        <p className="text-sm text-fg-muted">Chalalá! Decidiu na hora e fez acontecer.</p>
      </section>}
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-[11px] text-fg-subtle">Exercícios</dt><dd className="text-xl font-bold">{resumo.exercicios}</dd></div>
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-[11px] text-fg-subtle">Séries</dt><dd className="text-xl font-bold">{resumo.series}</dd></div>
        <div className="rounded-xl border border-border bg-card p-3"><dt className="text-[11px] text-fg-subtle">Tempo</dt><dd className="text-xl font-bold">{duracaoMin != null ? `${duracaoMin} min` : "—"}</dd></div>
      </dl>
      {resumo.volumeKg || resumo.maiorCarga || resumo.tecnicas.length ? (
        <ul className="space-y-1 rounded-xl border border-border bg-card p-4 text-sm">
          {resumo.volumeKg ? <li>🏋️ Carga total levantada: <strong>{kg(resumo.volumeKg)}</strong></li> : null}
          {resumo.maiorCarga ? <li>🔝 Maior carga: <strong>{kg(resumo.maiorCarga.carga)}</strong> no {resumo.maiorCarga.nome}</li> : null}
          {resumo.tecnicas.length ? <li>⚡ Técnicas: <strong>{resumo.tecnicas.join(", ")}</strong></li> : null}
        </ul>
      ) : null}

      <section className="space-y-2" aria-label="O que você fez">
        <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">O que você fez</h2>
        <ol className="space-y-2">
          {exercicios.filter((e) => e.series.length).map((e, i) => (
            <li key={`${e.nome}-${i}`} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <p className="font-semibold">{i + 1}. {e.nome}</p>
              <p className="text-xs text-fg-muted">{e.series.map((s) => `${s.tipo === "aquecimento" ? "aquec. " : ""}${s.carga_kg != null ? `${String(s.carga_kg).replace(".", ",")} kg` : ""}${s.carga_kg != null && s.reps != null ? " × " : ""}${s.reps != null ? (s.carga_kg != null ? s.reps : `${s.reps} reps`) : ""}`).join(" · ")}</p>
            </li>
          ))}
        </ol>
      </section>

      {podeSalvar && paraSalvar.length ? (
        <section className="space-y-2 rounded-xl border border-border bg-card p-4" aria-label="Salvar como treino">
          {estado === "salvo" ? (
            <>
              <p className="font-semibold">✅ Salvo em Meus treinos!</p>
              <p className="text-sm text-fg-muted">Da próxima vez é só abrir e repetir — ou ajustar o que quiser.</p>
              <Link href="/aluno/meus-treinos" className="alvo inline-block text-sm font-semibold text-accent">Ver Meus treinos →</Link>
            </>
          ) : (
            <>
              <p className="font-semibold">Gostou? Salve como treino</p>
              <p className="text-sm text-fg-muted">Ele vai para Meus treinos com as séries e repetições que você fez, para repetir depois.</p>
              <input value={nome} onChange={(ev) => setNome(ev.target.value.slice(0, 60))} aria-label="Nome do treino" className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm" />
              {erro ? <p role="alert" className="text-sm text-red">{erro}</p> : null}
              <Button variant="gold" className="w-full" loading={estado === "salvando"} disabled={nome.trim().length < 2} onClick={() => void salvar()}>Salvar como treino</Button>
            </>
          )}
        </section>
      ) : null}

      {dentroDoFim ? null : <div className="grid grid-cols-2 gap-2">
        <Link href="/aluno/conquistas" className="alvo flex min-h-11 items-center justify-center rounded-lg border border-border text-sm font-semibold">Ver conquistas</Link>
        <Link href="/aluno" className="alvo flex min-h-11 items-center justify-center rounded-lg border border-border text-sm font-semibold">Ir para o início</Link>
      </div>}
    </div>
  );
}
