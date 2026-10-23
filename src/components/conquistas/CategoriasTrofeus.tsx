// Categorias dos troféus no topo da tela Conquistas: cada uma abre a lista
// só daquele tema (com quantos já foram conquistados).
import Link from "next/link";
import { CATEGORIA_EMOJI, CATEGORIA_ROTULO, CONTEUDO, type Categoria } from "@/lib/conquistas/conteudo";

type MedalhaResumo = { codigo: string; conquistada: boolean };

export function contagemPorCategoria(medalhas: MedalhaResumo[]): Array<{ cat: Categoria; ganhas: number; total: number }> {
  return (Object.keys(CATEGORIA_ROTULO) as Categoria[])
    .map((cat) => {
      const doTema = medalhas.filter((m) => CONTEUDO[m.codigo as keyof typeof CONTEUDO]?.categoria === cat);
      return { cat, ganhas: doTema.filter((m) => m.conquistada).length, total: doTema.length };
    })
    .filter((c) => c.total > 0);
}

export function CategoriasTrofeus({ medalhas, atual }: { medalhas: MedalhaResumo[]; atual?: Categoria | null }) {
  const cats = contagemPorCategoria(medalhas);
  return (
    <nav aria-label="Categorias dos troféus" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex gap-2">
        {cats.map(({ cat, ganhas, total }) => (
          <li key={cat} className="shrink-0">
            <Link
              href={`/aluno/conquistas/todas?aba=temas&tema=${cat}`}
              aria-current={atual === cat ? "page" : undefined}
              className={`flex w-28 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center ${atual === cat ? "border-accent bg-accent/15" : "border-border bg-card hover:border-accent/60"}`}
            >
              <span className="text-2xl" aria-hidden>{CATEGORIA_EMOJI[cat]}</span>
              <span className="text-xs font-bold leading-tight">{CATEGORIA_ROTULO[cat]}</span>
              <span className="font-mono text-[11px] text-fg-subtle">{ganhas}/{total}</span>
            </Link>
          </li>
        ))}
        <li className="shrink-0">
          <Link href="/aluno/conquistas/todas?aba=desafiadores" className="flex w-28 flex-col items-center gap-1 rounded-xl border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-2 py-2.5 text-center">
            <span className="text-2xl" aria-hidden>🔥</span>
            <span className="text-xs font-bold leading-tight text-[#f5c451]">Mais desafiadores</span>
          </Link>
        </li>
        <li className="shrink-0">
          <Link href="/aluno/ranking" className="flex w-28 flex-col items-center gap-1 rounded-xl border border-accent/50 px-2 py-2.5 text-center">
            <span className="text-2xl" aria-hidden>🏆</span>
            <span className="text-xs font-bold leading-tight text-accent">Ranking</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
