import Link from "next/link";
import { resumoDesafio, TIPOS_DESAFIO } from "@/lib/desafios/regras";
import type { ResumoDesafio } from "@/lib/data/desafios";

const SITUACAO = { andamento: "Em andamento", agendado: "Começa em breve", encerrado: "Encerrado" } as const;

export function CardDesafio({ d }: { d: ResumoDesafio }) {
  return (
    <Link href={`/aluno/desafios/${d.id}`} className={`alvo block rounded-2xl border p-4 ${d.situacao === "andamento" ? "border-accent/50 bg-card" : "border-border bg-card/60"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold leading-snug">
          {TIPOS_DESAFIO[d.tipo].emoji} {d.nome}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.situacao === "andamento" ? "bg-accent/15 text-accent" : "bg-white/5 text-fg-muted"}`}>{SITUACAO[d.situacao]}</span>
      </div>
      <p className="mt-1 text-xs text-fg-muted">{resumoDesafio(d)}</p>
      <p className="mt-1 text-xs text-fg-subtle">
        {d.aceitos} {d.aceitos === 1 ? "participante" : "participantes"}
        {d.souCriador ? " · criado por você" : ""}
      </p>
    </Link>
  );
}
