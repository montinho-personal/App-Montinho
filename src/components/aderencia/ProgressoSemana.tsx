// Progresso da semana em relação à meta individual (círculo) + sequência.
import type { Semana } from "@/lib/aderencia/calcular";
import { mensagemDaJornada } from "@/lib/conquistas/conteudo";

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function ProgressoSemana({ semana, sequencia, extras = 0 }: { semana: Semana | null; sequencia: { atual: number; melhor: number; semanasCumpridas?: number }; extras?: number }) {
  if (!semana || !semana.meta) return null;
  const meta = semana.meta;
  const pct = Math.min(1, semana.pontos / meta);
  const r = 26;
  const c = 2 * Math.PI * r;
  const cumprida = semana.pontos >= meta;
  const frase = semana.pausada
    ? "Semana em pausa combinada com o Montinho: ela não conta como falta."
    : cumprida
      ? `Meta da semana alcançada: ${num(semana.pontos)} de ${meta} ${meta === 1 ? "treino" : "treinos"}.`
      : meta === 1 ? `Você completou ${num(semana.pontos)} do seu 1 treino desta semana.` : `Você completou ${num(semana.pontos)} dos seus ${meta} treinos desta semana.`;
  // Quando a meta da semana fecha: o que isso significa na jornada (sem prazo mágico).
  const jornada = cumprida && !semana.pausada && sequencia.semanasCumpridas != null ? mensagemDaJornada(sequencia.semanasCumpridas + 1) : null;
  return (
    <div className="flex items-center gap-4">
      <svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={`${num(semana.pontos)} de ${meta} treinos da semana`} className="shrink-0">
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={cumprida ? "var(--color-success)" : "var(--color-accent)"} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 34 34)" className="transition-[stroke-dasharray] duration-500 motion-reduce:transition-none" />
        <text x="34" y="39" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">
          {num(semana.pontos)}/{meta}
        </text>
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-fg-subtle font-semibold">Esta semana</p>
        <p className="font-bold leading-snug">{frase}</p>
        <p className="text-xs text-fg-muted mt-0.5">
          {sequencia.atual > 0 ? `${sequencia.atual} semana${sequencia.atual > 1 ? "s" : ""} seguida${sequencia.atual > 1 ? "s" : ""} com a meta cumprida` : "A sequência começa quando a meta da semana é cumprida."}
          {sequencia.melhor > sequencia.atual ? ` · melhor: ${sequencia.melhor}` : ""}
          {extras ? ` · ${extras} extra${extras > 1 ? "s" : ""} (não entram na meta)` : ""}
        </p>
        {jornada ? <p className="mt-1 text-xs text-fg">{jornada}</p> : null}
      </div>
    </div>
  );
}
