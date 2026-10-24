import Link from "next/link";
import type { Cutucada, ResumoDesafio } from "@/lib/data/desafios";

/**
 * Atalho para os desafios. No Ranking aparece sempre; no Início (compacto) só
 * quando há algo chamando: convite, cutucada ou recado do placar.
 */
export function EntradaDesafios({ desafios, compacto = false, recados = [], cutucadas = [] }: { desafios: ResumoDesafio[]; compacto?: boolean; recados?: Array<{ id: string; texto: string }>; cutucadas?: Cutucada[] }) {
  const convites = desafios.filter((d) => d.meuStatus === "convidado" && d.situacao !== "encerrado").length;
  const ativos = desafios.filter((d) => d.meuStatus === "aceito" && d.situacao !== "encerrado").length;
  if (compacto && !convites && !recados.length && !cutucadas.length) return null;
  return (
    <div className="space-y-2">
      <Link href="/aluno/desafios" className={`alvo flex items-center gap-3 rounded-2xl border px-4 py-3 ${convites ? "border-2 border-accent bg-accent/10" : "border-border bg-card"}`}>
        <span className="text-2xl" aria-hidden>⚔️</span>
        <span className="flex-1">
          <span className="block font-bold">{convites ? `Você tem ${convites === 1 ? "1 convite" : `${convites} convites`} para desafio!` : "Desafios entre amigos"}</span>
          <span className="block text-xs text-fg-muted">{convites ? "Toque para ver e aceitar." : ativos ? `${ativos} em andamento · desafie mais alguém` : "Desafie quem treina com você"}</span>
        </span>
        <span aria-hidden className="text-fg-subtle">→</span>
      </Link>
      {cutucadas.slice(0, 2).map((c) => (
        <Link key={c.id} href={`/aluno/desafios/${c.desafioId}`} className="alvo block rounded-xl border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-semibold">
          {c.emoji} {c.de} te cutucou em “{c.desafio}”!
        </Link>
      ))}
      {recados.map((r) => (
        <Link key={r.id} href={`/aluno/desafios/${r.id}`} className="alvo block rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
          {r.texto}
        </Link>
      ))}
    </div>
  );
}
