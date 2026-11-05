// Barra da obra com os marcos das etapas (10%, 25%… 100%).
import { ETAPAS } from "@/lib/academia/regras";

export function BarraObra({ pct, pequena = false }: { pct: number; pequena?: boolean }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} aria-label="Progresso da obra">
      <div className={`overflow-hidden rounded-full bg-border ${pequena ? "h-2" : "h-3.5"}`}>
        <div className="h-full rounded-full bg-gradient-to-r from-[#8f762f] via-accent to-[#e0c677] transition-[width] duration-700" style={{ width: `${p}%` }} />
      </div>
      {!pequena
        ? ETAPAS.slice(1, 7).map((e) => (
            <span key={e.n} aria-hidden className={`absolute top-0 h-3.5 w-0.5 ${p >= e.pct ? "bg-bg/60" : "bg-fg-subtle/50"}`} style={{ left: `${e.pct}%` }} />
          ))
        : null}
    </div>
  );
}
