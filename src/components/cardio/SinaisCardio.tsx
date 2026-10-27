// Sinais de cardio para o personal: ferramenta de acompanhamento, não diagnóstico.
import type { SinalCardio } from "@/lib/cardio/regras";

const ESTILO = { atencao: "border-danger/40 bg-danger/5", acompanhar: "border-warning/40 bg-warning/5", reconhecer: "border-accent/40 bg-accent/5" } as const;
const EMOJI = { atencao: "🔴", acompanhar: "🟡", reconhecer: "💛" } as const;

export function SinaisCardio({ sinais }: { sinais: SinalCardio[] }) {
  if (!sinais.length) return null;
  return (
    <ul className="space-y-1.5">
      {sinais.map((s) => (
        <li key={`${s.tipo}:${s.data}`} className={`rounded-lg border px-3 py-2 text-sm ${ESTILO[s.nivel]}`}>
          {EMOJI[s.nivel]} {s.texto}
        </li>
      ))}
    </ul>
  );
}
