// Cardios do Strava (corrida, bike, caminhada…): resumo da semana + lista.
// Mesmo cartão para o aluno (Evolução) e para o personal (ficha do aluno).
import type { CardioStrava } from "@/lib/strava/cardio";
import { resumoSemanaCardio, textoCardioStrava, tipoCardio } from "@/lib/strava/cardio";

const dia = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", weekday: "short" }).format(new Date(iso));

export function CardiosStrava({ cardios, hoje, titulo = "Cardio (Strava)" }: { cardios: CardioStrava[]; hoje: string; titulo?: string }) {
  if (!cardios.length) return null;
  const semana = resumoSemanaCardio(cardios, hoje);
  return (
    <section className="space-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm" aria-label={titulo}>
      <p className="text-xs font-bold uppercase tracking-wider text-accent">🏃 {titulo}</p>
      <p className="font-semibold">
        Nesta semana: {semana.atividades} {semana.atividades === 1 ? "cardio" : "cardios"}
        {semana.minutos ? ` · ${semana.minutos} min` : ""}
        {semana.km ? ` · ${semana.km.toLocaleString("pt-BR")} km` : ""}
      </p>
      <ul className="space-y-1">
        {cardios.map((c) => (
          <li key={c.atividade_id} className="flex gap-2 border-t border-border pt-1 text-xs">
            <span aria-hidden>{tipoCardio(c.tipo).emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block">{textoCardioStrava(c)}</span>
              <span className="block text-fg-subtle">
                {dia(c.inicio)}
                {c.nome ? ` · ${c.nome}` : ""} ·{" "}
                <a href={`https://www.strava.com/activities/${c.atividade_id}`} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2" style={{ color: "#FC4C02" }}>Ver no Strava</a>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-fg-subtle">Os cardios aparecem à parte e não contam na meta de treinos de musculação.</p>
    </section>
  );
}
