// Esqueleto mostrado na hora em que a navegação começa (resposta imediata ao toque).
export function Carregando({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-7 w-48 animate-pulse rounded-md bg-card" />
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}
