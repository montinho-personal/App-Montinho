// Cartão de carimbos: 1 carimbo por treino concluído, cartões de 10 que nunca
// zeram. Também é o 2º desempate do ranking (depois da semana passada).
import { CARIMBOS_POR_CARTAO, cartaoDeCarimbos } from "@/lib/conquistas/carimbos";

export function CartaoCarimbos({ total, titulo = "Seus carimbos" }: { total: number; titulo?: string }) {
  const c = cartaoDeCarimbos(total);
  return (
    <section className="rounded-xl border border-gold/40 bg-gold/5 p-4" aria-label={`${titulo}: ${total}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-bold">🎟️ {titulo}</p>
        <p className="text-2xl font-black text-gold">{total}</p>
      </div>
      <p className="text-xs text-fg-muted">1 carimbo por treino concluído. {c.cartoesCheios ? `${c.cartoesCheios} ${c.cartoesCheios === 1 ? "cartão completo" : "cartões completos"} · ` : ""}{c.faltam === 1 ? "Falta 1 para fechar este cartão" : `Faltam ${c.faltam} para fechar este cartão`}.</p>
      <div className="mt-3 grid grid-cols-5 gap-2" aria-hidden>
        {Array.from({ length: CARIMBOS_POR_CARTAO }, (_, i) => (
          <div key={i} className={`flex aspect-square items-center justify-center rounded-full border-2 text-lg ${i < c.noCartao ? "-rotate-12 border-gold bg-gold/20 text-gold" : "border-dashed border-border text-fg-subtle"}`}>
            {i < c.noCartao ? "✓" : i + 1 + c.cartoesCheios * CARIMBOS_POR_CARTAO}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-fg-subtle">No ranking, se empatar em troféus e na semana passada, quem tem mais carimbos fica na frente.</p>
    </section>
  );
}
