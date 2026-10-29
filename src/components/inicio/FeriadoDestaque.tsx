// Destaque do feriado no Início (pedido do Montinho, 29/10/2026): aparece desde
// a véspera e no próprio dia, com os 3 troféus que levam o nome do feriado
// (musculação, cardio e o +1 dos dois) e o que já foi ganho.
import Link from "next/link";
import { referenciaFeriado, tituloFeriado, type CodigoFeriado, type destaqueFeriado } from "@/lib/conquistas/feriados";

type Destaque = NonNullable<ReturnType<typeof destaqueFeriado>>;

const ITENS: Array<{ codigo: CodigoFeriado; emoji: string; como: string }> = [
  { codigo: "feriado_musculacao", emoji: "💪", como: "Treino de musculação" },
  { codigo: "feriado_cardio", emoji: "❤️‍🔥", como: "Cardio de 10+ min" },
  { codigo: "feriado_combo", emoji: "➕", como: "Os dois no mesmo feriado" },
];

export function FeriadoDestaque({ d, conquistas }: { d: Destaque; conquistas: Array<{ codigo: string; referencia: string }> }) {
  const ref = referenciaFeriado(d.feriado, d.dia);
  const ganhos = new Set(conquistas.filter((c) => c.referencia === ref).map((c) => c.codigo));
  const hoje = d.quando === "hoje";
  const dia = `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`;
  const todos = ITENS.every((i) => ganhos.has(i.codigo));
  return (
    <section id="feriado" aria-label={`Feriado de ${d.feriado.nome}`} className="scroll-mt-24 space-y-3 rounded-2xl border-2 border-accent bg-grain-strong p-4 shadow-[0_0_24px_rgba(201,168,90,0.25)]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{hoje ? "🎉 Hoje é feriado" : "🎉 Amanhã é feriado"} · {dia}</p>
      <h2 className="text-xl font-extrabold leading-tight">
        {d.feriado.emoji} {d.feriado.nome}: {todos ? "feriado completo!" : "treinar vale troféu!"}
      </h2>
      <p className="text-sm text-fg-muted">
        {todos
          ? "Você levou os 3 troféus deste feriado. Aproveite o descanso! 💛"
          : hoje
            ? "Cada troféu leva o nome do feriado. Musculação e cardio valem separados, e os dois juntos valem +1."
            : "Amanhã cada treino vale troféu com o nome do feriado. Já deixe o horário separado!"}
      </p>
      <ul className="space-y-2">
        {ITENS.map((i) => {
          const ok = ganhos.has(i.codigo);
          return (
            <li key={i.codigo} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${ok ? "border-success/50 bg-success/10" : "border-line bg-surface/60"}`}>
              <span aria-hidden className="text-2xl">{ok ? "🏆" : i.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold leading-tight">{tituloFeriado(i.codigo, d.feriado.nome)}</span>
                <span className="block text-xs text-fg-subtle">{i.como}</span>
              </span>
              <span className={`text-xs font-bold ${ok ? "text-success" : "text-fg-subtle"}`}>{ok ? "✓ Ganho" : hoje ? "Em jogo" : "Amanhã"}</span>
            </li>
          );
        })}
      </ul>
      {!todos ? (
        <div className="grid grid-cols-2 gap-2">
          <Link href="/aluno/treinar" className="touch flex items-center justify-center rounded-xl bg-accent px-3 py-3 text-center font-bold text-bg">
            💪 {hoje ? "Treinar agora" : "Ver meu treino"}
          </Link>
          <Link href="/aluno/cardio" className="touch flex items-center justify-center rounded-xl border border-accent px-3 py-3 text-center font-bold text-accent">
            ❤️‍🔥 {hoje ? "Fazer cardio" : "Ver cardio"}
          </Link>
        </div>
      ) : (
        <Link href="/aluno/conquistas" className="touch flex items-center justify-center rounded-xl bg-accent px-3 py-3 font-bold text-bg">
          📲 Ver e compartilhar meus troféus
        </Link>
      )}
    </section>
  );
}
