"use client";

// Botão “🎲 Treino livre” da aula presencial: começa o treino livre do aluno (o personal anota).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CABECALHO_ALUNO } from "@/lib/auth/cabecalho";

export function ComecarLivreAula({ alunoId, nome }: { alunoId: string; nome: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function comecar() {
    setOcupado(true);
    setErro(null);
    try {
      const r = await fetch("/api/livre", { method: "POST", headers: { "Content-Type": "application/json", [CABECALHO_ALUNO]: alunoId }, body: JSON.stringify({ client_key: `aula-livre-${Date.now().toString(36)}` }) });
      const j = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!r.ok || !j.id) throw new Error(j.error ?? "Não foi possível começar agora.");
      router.push(`/treinador/alunos/${alunoId}/aula/livre/${j.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível começar agora.");
      setOcupado(false);
    }
  }
  return (
    <div>
      <button type="button" onClick={() => void comecar()} disabled={ocupado} className="touch flex w-full items-center gap-3 rounded-xl border border-dashed border-accent/60 bg-card px-4 py-3 text-left hover:border-accent disabled:opacity-60">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-xl" aria-hidden>🎲</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{ocupado ? "Abrindo…" : "Treino livre"}</span>
          <span className="block text-xs text-fg-subtle">Fora da ficha: você escolhe os exercícios na hora e anota as séries de {nome}.</span>
        </span>
      </button>
      {erro ? <p role="alert" className="mt-1 text-xs text-danger">{erro}</p> : null}
    </div>
  );
}
