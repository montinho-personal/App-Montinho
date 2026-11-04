// Parabéns pela evolução na avaliação física de 7 dobras (regra em
// src/lib/medidas/evolucao-avaliacao.ts): manchete, o que melhorou e o botão
// de compartilhar o card (logo oficial, só o primeiro nome).
import Link from "next/link";
import type { EvolucaoAvaliacao } from "@/lib/medidas/evolucao-avaliacao";
import type { CardRelatorio } from "@/lib/relatorios/card-relatorio";
import { CompartilharCardRelatorio } from "@/components/relatorios/CompartilharCardRelatorio";
import { dataBR } from "@/lib/format";

export function ParabensAvaliacao({ e, card, verHref, personal = false, claro = false }: { e: EvolucaoAvaliacao; card: CardRelatorio | null; verHref?: string; personal?: boolean; /** Fundo claro (relatório A4). */ claro?: boolean }) {
  if (!e.evoluiu) return null;
  return (
    <section aria-label="Evolução na avaliação" className={`space-y-3 rounded-2xl border-2 p-4 ${claro ? "border-[#ba9e50] bg-[#fbf6e8] text-[#1a1814]" : "border-accent bg-[linear-gradient(160deg,#2a2415_0%,#0a0a0a_85%)]"}`}>
      <div>
        <p className={`text-[11px] font-bold uppercase tracking-wider ${claro ? "text-[#8a7232]" : "text-accent"}`}>🎉 {personal ? "Evolução na avaliação" : "Parabéns! Você evoluiu"}</p>
        <h2 className="mt-1 text-xl font-black leading-tight">{e.manchete}</h2>
        <p className={`mt-0.5 text-xs ${claro ? "text-[#5c564b]" : "text-fg-muted"}`}>Avaliação de {dataBR(e.data)} comparada com a de {dataBR(e.anteriorData)}.</p>
      </div>
      <ul className="space-y-1.5 text-sm">
        {e.itens.map((i) => (
          <li key={i.chave} className="flex gap-2">
            <span aria-hidden>{i.emoji}</span>
            <span>{i.texto}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <CompartilharCardRelatorio card={card} registrar={!personal} rotulo={personal ? "📲 Card para o aluno" : "📲 Compartilhar minha evolução"} className={claro ? "inline-flex h-10 items-center rounded-full bg-[#1a1814] px-4 text-sm font-semibold text-white disabled:opacity-60" : "touch inline-flex items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-bg disabled:opacity-60"} />
        {verHref ? (
          <Link href={verHref} className="touch inline-flex items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">
            📄 Ver o relatório
          </Link>
        ) : null}
      </div>
    </section>
  );
}
