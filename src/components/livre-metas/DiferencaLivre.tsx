// “Protocolo livre” × “Treino livre” (pedido do Montinho, 28/10/2026: deixar bem claro).
export function DiferencaLivre() {
  return (
    <section aria-label="Protocolo livre e treino livre" className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-accent/40 bg-card p-3">
        <p className="text-sm font-bold">🎯 Protocolo livre</p>
        <p className="text-xs text-fg-muted">É o plano da <strong>semana inteira</strong>: sem treinos A, B, C. Você define só quantas séries cada músculo recebe por semana (ex.: Peito 10–14).</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-bold">🎲 Treino livre</p>
        <p className="text-xs text-fg-muted">É o treino de <strong>um dia</strong>: você escolhe cada exercício na hora. Dá para fazer em qualquer protocolo — e no protocolo livre, cada série entra na conta da semana.</p>
      </div>
    </section>
  );
}
