// Placar da semana do protocolo livre (por metas) (servidor ou cliente).
import { STATUS_META, type LinhaPlacar, type Sugestao } from "@/lib/treino/livre-metas";

const COR: Record<LinhaPlacar["status"], string> = {
  zerado: "bg-fg-subtle/40",
  abaixo: "bg-gold",
  na_faixa: "bg-success",
  limite: "bg-red",
  acima: "bg-red",
};

export function PlacarMetas({ placar, sugestao, titulo = "🎯 Sua semana por músculo", compacto, resumo, nota }: { placar: LinhaPlacar[]; sugestao?: Sugestao | null; titulo?: string; compacto?: boolean; resumo?: string; nota?: string | null }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Placar da semana">
      <p className="text-sm font-bold">{titulo}</p>
      {resumo ? <p className="mt-1 text-sm text-fg-muted">{resumo}</p> : null}
      {sugestao ? <p className="mt-1 rounded-lg bg-accent/10 px-3 py-2 text-sm text-fg">💡 {sugestao.texto}</p> : null}
      <ul className={`mt-3 grid gap-x-4 gap-y-2 ${compacto ? "grid-cols-2" : "sm:grid-cols-2"}`}>
        {placar.map((l) => {
          const pct = Math.min(100, Math.round((l.feitas / Math.max(1, l.max)) * 100));
          const st = STATUS_META[l.status];
          return (
            <li key={l.grupo} className="text-xs">
              <div className="flex items-baseline gap-1">
                <span className="font-semibold text-fg">{l.nome}</span>
                <span className="ml-auto tabular-nums text-fg-muted">
                  {String(l.feitas).replace(".", ",")} de {l.min}–{l.max}
                </span>
                <span aria-label={st.rotulo} title={st.rotulo}>{st.emoji}</span>
              </div>
              <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className={`h-full ${COR[l.status]}`} style={{ width: `${pct}%` }} />
                <div className="absolute top-0 h-full w-px bg-fg/40" style={{ left: `${Math.round((l.min / Math.max(1, l.max)) * 100)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {nota ? <p className="mt-2 text-[11px] text-fg-muted">{nota}</p> : null}
      <p className="mt-2 text-[10px] text-fg-subtle">⚪ ainda não fez · 🟡 abaixo da faixa · ✅ na faixa · 🔴 no limite ou passou (só aviso)</p>
    </section>
  );
}
