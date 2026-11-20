// Abertura do Ranking de troféus: a corrida pelo topo como parte da Jornada do Chalalá.
export function NarrativaRanking() {
  return (
    <header className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">A Jornada do Chalalá</p>
        <h1 className="text-2xl font-bold">Rumo ao topo</h1>
        <p className="mt-1 text-sm text-fg-muted">Cada troféu é um passo a mais na sua Jornada. Quem junta mais troféus sobe mais alto, e o topo do pódio está esperando quem não para.</p>
      </div>
      {/* Recolhido (20/11/2026, auditoria): quem abre o Ranking quer ver a posição primeiro; as dicas ficam a um toque. */}
      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold">
          💡 Como subir no ranking
          <span aria-hidden className="text-fg-subtle transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="space-y-3 border-t border-border p-3">
      <ul className="space-y-2 text-sm">
        <li className="flex gap-2"><span aria-hidden>🏋️</span><span><strong>Treine e cumpra a sua meta da semana.</strong> É daí que sai a maioria dos troféus.</span></li>
        <li className="flex gap-2"><span aria-hidden>🔥</span><span><strong>Encare os Mais desafiadores.</strong> Contam como qualquer outro troféu, mas poucos têm coragem de buscar.</span></li>
        <li className="flex gap-2"><span aria-hidden>🧱</span><span><strong>Empatou? Vence quem é mais constante.</strong> Quem não para não é ultrapassado.</span></li>
      </ul>
      <p className="text-sm font-semibold text-accent">O topo não é de quem começa mais forte. É de quem continua. Chalalá!</p>
        </div>
      </details>
    </header>
  );
}
