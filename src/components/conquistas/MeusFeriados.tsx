// “🎉 Meus feriados” (15/11/2026, pedido do Montinho): cada feriado em que a pessoa
// treinou vale troféus de novo; aqui fica o histórico — qual feriado, o que fez e
// quantos troféus valeu — e o próximo feriado.
import { historicoDeFeriados, proximoFeriado, textoDoFeriado, tituloFeriado, type CodigoFeriado } from "@/lib/conquistas/feriados";

type Conquista = { codigo: string; referencia: string | null; conquistado_em: string; evidencia?: Record<string, unknown> | null };

const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export function MeusFeriados({ conquistas, hoje, nome }: { conquistas: Conquista[]; hoje: string; nome?: string }) {
  const itens = historicoDeFeriados(conquistas);
  const prox = proximoFeriado(hoje);
  if (itens.length === 0 && !prox) return null;
  const total = itens.reduce((n, i) => n + i.trofeus, 0);
  const quem = nome ? nome : "Você";
  return (
    <section id="feriados" aria-labelledby="feriados-titulo" className="scroll-mt-24 space-y-3 rounded-2xl border border-accent/40 bg-grain-strong p-4">
      <div>
        <p id="feriados-titulo" className="text-[11px] font-bold uppercase tracking-wider text-accent">🎉 {nome ? `Feriados de ${nome}` : "Meus feriados"}</p>
        {itens.length > 0 ? (
          <p className="mt-1 text-sm">
            {quem} treinou em <b>{itens.length} {itens.length === 1 ? "feriado" : "feriados"}</b> e ganhou <b>{total} {total === 1 ? "troféu" : "troféus"}</b> com eles. Cada feriado vale troféus de novo e todos contam no ranking.
          </p>
        ) : (
          <p className="mt-1 text-sm">Treinar num feriado vale troféu com o nome dele, e cada feriado vale de novo.</p>
        )}
      </div>
      {itens.length > 0 ? (
        <ul className="space-y-2">
          {itens.map((f) => {
            const codigos: CodigoFeriado[] = [...(f.musculacao ? (["feriado_musculacao"] as const) : []), ...(f.cardio ? (["feriado_cardio"] as const) : []), ...(f.combo ? (["feriado_combo"] as const) : [])];
            return (
              <li key={f.referencia} className="rounded-xl bg-bg/50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-bold">{f.emoji} {f.nome}</p>
                  <p className="shrink-0 text-xs text-fg-subtle">{f.dia ? dataBR(f.dia) : f.ano}</p>
                </div>
                <p className="text-xs text-fg-muted">{textoDoFeriado(f)} · {f.trofeus} {f.trofeus === 1 ? "troféu" : "troféus"}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {codigos.map((c) => (
                    <span key={c} className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] font-semibold text-accent">
                      {c === "feriado_musculacao" ? "💪" : c === "feriado_cardio" ? "❤️" : "➕"} {tituloFeriado(c, f.nome)}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {prox ? (
        <p className="text-xs text-fg-muted">
          {prox.dia === hoje ? `${prox.feriado.emoji} Hoje é ${prox.feriado.nome}! Musculação, cardio ou os dois: cada um vale um troféu.` : `${prox.feriado.emoji} Próximo: ${prox.feriado.nome}, ${dataBR(prox.dia).slice(0, 5)}. Musculação e cardio valem troféus de novo.`}
        </p>
      ) : null}
    </section>
  );
}
