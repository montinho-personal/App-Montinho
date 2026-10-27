// “Não está a fim de nenhum desses treinos?” (pedido do Montinho, 28/10/2026):
// treino livre para qualquer aluno ou visitante, com a sugestão de hoje pelo que
// já fez na semana × a meta semanal de cada músculo.
import Link from "next/link";
import type { PlacarDoAluno } from "@/lib/data/livre-metas";

export function FacaOQueQuiser({ p, compacto }: { p: PlacarDoAluno | null; compacto?: boolean }) {
  if (compacto) {
    return (
      <Link href="/aluno/livre" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-accent/60">
        <span className="text-2xl" aria-hidden>🎲</span>
        <span className="min-w-0">
          <span className="block text-sm font-bold">Não está a fim desse treino hoje?</span>
          <span className="block text-xs text-fg-muted">{p?.sugestao?.grupos.length ? `Faça o que quiser. Sugestão: ${p.sugestao.texto.replace(/^Hoje o melhor é /, "").split(".")[0]}.` : "Faça aqui o que você quer fazer hoje."}</span>
        </span>
      </Link>
    );
  }
  return (
    <section className="space-y-2 rounded-xl border border-dashed border-accent/60 bg-card p-4" aria-label="Treino livre de hoje">
      <p className="font-bold">😴 Não está a fim de nenhum desses treinos?</p>
      <p className="text-sm text-fg-muted">Faça aqui o que você quer fazer hoje: escolha cada exercício na hora e o app anota tudo. Conta na sua semana como qualquer treino.</p>
      {p ? (
        <div className="space-y-1 rounded-lg bg-accent/10 px-3 py-2 text-sm">
          <p>{p.resumo}</p>
          {p.sugestao ? <p className="font-semibold">💡 {p.sugestao.texto}</p> : null}
        </div>
      ) : null}
      <Link href="/aluno/livre" className="touch flex min-h-12 items-center justify-center gap-2 rounded-lg border border-accent px-4 font-bold text-accent hover:bg-accent/10">
        🎲 Fazer o meu treino de hoje
      </Link>
    </section>
  );
}
