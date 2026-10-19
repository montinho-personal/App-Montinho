// Acordeão acessível com <details>: funciona sem JS, teclado e leitor de tela.
export function Acordeao({ titulo, resumo, children, aberto = false }: { titulo: string; resumo?: string; children: React.ReactNode; aberto?: boolean }) {
  return (
    <details className="group rounded-xl border border-border bg-card" open={aberto}>
      <summary className="touch flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-bold">{titulo}</span>
          {resumo ? <span className="block text-xs text-fg-subtle">{resumo}</span> : null}
        </span>
        <span className="text-fg-subtle transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="px-4 pb-4 pt-1 border-t border-border">{children}</div>
    </details>
  );
}
