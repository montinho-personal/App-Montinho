// Um treino do plano como bloco que abre e fecha (estilo FAQ). Fechado: letra,
// nome completo, resumo e grupos principais. Aberto: cada exercício com
// séries × repetições, técnica, descanso, RIR e grupo. Usa <details>
// (funciona sem JS, com teclado e leitor de tela).
import Link from "next/link";
import type { ExercicioPrescrito } from "@/lib/supabase/types-sessoes";
import { GRUPO_COR, GRUPO_LABEL } from "@/lib/grupos";
import { descreverTecnica, TECNICA_CURTA } from "@/lib/volume/tecnicas";
import { resumoDoTreino, seriesValidasDe } from "@/lib/treinos/resumo";

type Props = { letra: string; nome: string; exercicios: ExercicioPrescrito[]; vezesSemana: number; editarHref?: string; aberto?: boolean };

export function TreinoAcordeao({ letra, nome, exercicios, vezesSemana, editarHref, aberto = false }: Props) {
  const r = resumoDoTreino(exercicios);
  return (
    <details className="group rounded-xl border border-border bg-card open:border-accent/40" open={aberto}>
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-xl font-black text-accent" aria-hidden>
          {letra}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-tight">{nome}</span>
          <span className="mt-0.5 block text-xs text-fg-subtle">
            {exercicios.length} {exercicios.length === 1 ? "exercício" : "exercícios"} · {r.validas} séries válidas · {vezesSemana}×/sem
          </span>
          {r.grupos.length ? (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {r.grupos.map((g) => (
                <span key={g.grupo} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-fg-muted">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: GRUPO_COR[g.grupo] }} aria-hidden />
                  {GRUPO_LABEL[g.grupo]} · {g.series}
                </span>
              ))}
            </span>
          ) : null}
        </span>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/40 px-2.5 py-1 text-[11px] font-semibold text-accent">
          <span className="group-open:hidden">Ver</span>
          <span className="hidden group-open:inline">Fechar</span>
          <span className="transition-transform group-open:rotate-180" aria-hidden>▾</span>
        </span>
      </summary>

      <div className="border-t border-border px-4 pb-4 pt-2">
        <ol className="divide-y divide-border">
          {exercicios.map((e, i) => {
            const validas = seriesValidasDe(e);
            const tec = descreverTecnica({ tecnica: e.tecnica, tecnicaExtras: e.tecnica_extras, tecnicaSeries: e.tecnica_series }, validas);
            const tecRotulo = e.tecnica && e.tecnica !== "normal" ? TECNICA_CURTA[e.tecnica] : null;
            const detalhes = [
              e.descanso_seg ? `descanso ${e.descanso_seg}s` : null,
              e.rir != null ? `RIR ${e.rir}` : e.ie != null ? `esforço ${e.ie}/10` : null,
              e.series_aquecimento ? `${e.series_aquecimento} de aquecimento` : null,
              e.cadencia ? `cadência ${e.cadencia}` : null,
              e.unilateral ? "unilateral" : null,
            ].filter(Boolean);
            return (
              <li key={e.id} className="flex gap-3 py-2.5">
                <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-xs text-fg-subtle">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold leading-snug">{e.nome}</p>
                    <p className="font-mono text-xs text-fg">
                      {e.series} × {e.reps}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {e.grupo_muscular && e.grupo_muscular !== "nao_classificado" ? (
                      <span className="inline-flex items-center gap-1 text-fg-muted">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: GRUPO_COR[e.grupo_muscular] }} aria-hidden />
                        {GRUPO_LABEL[e.grupo_muscular]}
                      </span>
                    ) : null}
                    {tecRotulo ? <span className="rounded-full bg-accent/10 px-1.5 py-0.5 font-semibold text-accent">{tecRotulo}{tec ? ` (${tec})` : ""}</span> : null}
                    {e.conta_volume === false ? <span className="text-fg-subtle">não conta no volume</span> : null}
                  </div>
                  {detalhes.length ? <p className="text-[11px] text-fg-subtle">{detalhes.join(" · ")}</p> : null}
                  {e.observacoes ? <p className="text-[11px] text-fg-muted">Nota: {e.observacoes}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
        {editarHref ? (
          <Link href={editarHref} className="mt-2 inline-flex min-h-6 items-center text-xs font-semibold text-accent underline-offset-2 hover:underline">
            Editar no montador →
          </Link>
        ) : null}
      </div>
    </details>
  );
}
