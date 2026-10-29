// Menu do Perfil (pedido do Montinho, 29/10/2026: “mais profissional e
// intuitivo”): grupos com título, cada item numa linha (ícone, título,
// descrição curta e seta). “Abrir aqui” usa <details> (sem JavaScript): o
// conteúdo aparece embaixo da linha, sem trocar de tela.
import Link from "next/link";
import type { ReactNode } from "react";

export function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="space-y-1.5">
      <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">{titulo}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>
    </section>
  );
}

function Linha({ icone, titulo, sub, badge, seta }: { icone: string; titulo: string; sub?: string; badge?: string | null; seta: ReactNode }) {
  return (
    <>
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bg text-xl">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-tight">{titulo}</span>
        {sub ? <span className="block truncate text-xs text-fg-muted">{sub}</span> : null}
      </span>
      {badge ? <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-bg">{badge}</span> : null}
      {seta}
    </>
  );
}

const SETA = <span aria-hidden className="shrink-0 text-fg-subtle">›</span>;

export function ItemLink({ icone, titulo, sub, href, badge, externo }: { icone: string; titulo: string; sub?: string; href: string; badge?: string | null; externo?: boolean }) {
  const cls = "flex min-h-14 items-center gap-3 px-3 py-2.5 hover:bg-bg/60";
  return externo ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      <Linha icone={icone} titulo={titulo} sub={sub} badge={badge} seta={SETA} />
    </a>
  ) : href.startsWith("/api/") ? (
    // Rota de API (troca o modo e redireciona): <a> comum, sem pré-carregar.
    <a href={href} className={cls}>
      <Linha icone={icone} titulo={titulo} sub={sub} badge={badge} seta={SETA} />
    </a>
  ) : (
    <Link href={href} className={cls}>
      <Linha icone={icone} titulo={titulo} sub={sub} badge={badge} seta={SETA} />
    </Link>
  );
}

export function ItemAbrir({ icone, titulo, sub, badge, children, id, aberto = false }: { icone: string; titulo: string; sub?: string; badge?: string | null; children: ReactNode; id?: string; /** Já abre aberto (ex.: voltando da conexão do Strava). */ aberto?: boolean }) {
  return (
    <details id={id} open={aberto} className="group scroll-mt-24">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2.5 hover:bg-bg/60 [&::-webkit-details-marker]:hidden">
        <Linha icone={icone} titulo={titulo} sub={sub} badge={badge} seta={<span aria-hidden className="shrink-0 text-fg-subtle transition-transform group-open:rotate-90">›</span>} />
      </summary>
      <div className="border-t border-border bg-bg/40 p-3">{children}</div>
    </details>
  );
}
