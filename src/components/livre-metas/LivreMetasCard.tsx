// Cartão do treino livre por metas no Início e no Treinar: sugestão de agora + resumo da semana.
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { PlacarDoAluno } from "@/lib/data/livre-metas";

export function LivreMetasCard({ p }: { p: PlacarDoAluno }) {
  const naFaixa = p.placar.filter((l) => l.status === "na_faixa" || l.status === "limite" || l.status === "acima").length;
  const faltam = p.placar.reduce((n, l) => n + l.faltam, 0);
  return (
    <section className="space-y-3 rounded-xl border border-accent/40 bg-card bg-grain-strong p-4" aria-label="Treino livre por metas">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">🎯 Treino livre por metas</p>
      <p className="text-sm">{p.sugestao?.texto ?? "Escolha os exercícios na hora: o app conta as séries da semana de cada músculo."}</p>
      <p className="text-xs text-fg-muted">
        {naFaixa} de {p.placar.length} músculos na faixa{faltam ? ` · faltam ${faltam} séries para o mínimo da semana` : ""}
      </p>
      <Link href="/aluno/livre" className="touch inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-base font-bold text-bg hover:bg-accent-hover">
        <Icon name="play" /> Começar treino livre
      </Link>
    </section>
  );
}
