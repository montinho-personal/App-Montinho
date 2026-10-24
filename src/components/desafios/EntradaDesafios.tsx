import Link from "next/link";
import type { ResumoDesafio } from "@/lib/data/desafios";

/** Atalho para os desafios (Ranking e Início): convites esperando e desafios em andamento. */
export function EntradaDesafios({ desafios, compacto = false }: { desafios: ResumoDesafio[]; compacto?: boolean }) {
  const convites = desafios.filter((d) => d.meuStatus === "convidado" && d.situacao !== "encerrado").length;
  const ativos = desafios.filter((d) => d.meuStatus === "aceito" && d.situacao !== "encerrado").length;
  if (compacto && !convites) return null;
  return (
    <Link href="/aluno/desafios" className={`alvo flex items-center gap-3 rounded-2xl border px-4 py-3 ${convites ? "border-2 border-accent bg-accent/10" : "border-border bg-card"}`}>
      <span className="text-2xl" aria-hidden>⚔️</span>
      <span className="flex-1">
        <span className="block font-bold">{convites ? `Você tem ${convites === 1 ? "1 convite" : `${convites} convites`} para desafio!` : "Desafios entre amigos"}</span>
        <span className="block text-xs text-fg-muted">{convites ? "Toque para ver e aceitar." : ativos ? `${ativos} em andamento · crie outro e chame a galera` : "Crie um desafio e chame quem treina com você"}</span>
      </span>
      <span aria-hidden className="text-fg-subtle">→</span>
    </Link>
  );
}
