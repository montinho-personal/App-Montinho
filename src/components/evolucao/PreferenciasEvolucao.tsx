"use client";
// Preferências do aluno para os avisos de evolução (neste aparelho).
import { usePrefsEvolucao } from "./preferencias";

export function PreferenciasEvolucao() {
  const [p, mudar] = usePrefsEvolucao();
  const item = (k: "durante" | "aoConcluir" | "sons" | "animacoes", rotulo: string) => (
    <label className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span>{rotulo}</span>
      <input type="checkbox" checked={p[k]} onChange={(e) => mudar({ [k]: e.target.checked })} className="h-5 w-5 accent-[var(--color-accent)]" />
    </label>
  );
  return (
    <section className="space-y-1 rounded-xl border border-border p-4" aria-labelledby="pref-evo">
      <h2 id="pref-evo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Avisos de evolução no treino</h2>
      {item("durante", "Avisar logo depois da série")}
      {item("aoConcluir", "Resumo ao concluir cada exercício")}
      <label className="flex items-center justify-between gap-3 py-1.5 text-sm">
        <span>O que avisar</span>
        <select value={p.modo} onChange={(e) => mudar({ modo: e.target.value as "todas" | "recordes" })} className="h-9 rounded-md border border-border bg-bg px-2 text-sm">
          <option value="todas">Todas as evoluções relevantes</option>
          <option value="recordes">Só recordes</option>
        </select>
      </label>
      {item("sons", "Som discreto no aviso")}
      {item("animacoes", "Animações")}
      <p className="text-[11px] text-fg-subtle">Vale neste aparelho. No máximo 1 aviso por exercício e 3 por treino (o {"Montinho"} pode ajustar). O descanso nunca é interrompido.</p>
    </section>
  );
}
