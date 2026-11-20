// Seção do Início do aluno: um título pequeno + os cartões daquele assunto.
// Sem nenhum cartão dentro, a seção inteira some (CSS `.secao-inicio` em globals.css).
import type { ReactNode } from "react";

export function SecaoInicio({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="secao-inicio space-y-3">
      <h2 className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-fg-subtle">
        <span>{titulo}</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
