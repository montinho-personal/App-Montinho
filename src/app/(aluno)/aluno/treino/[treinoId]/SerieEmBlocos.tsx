"use client";

// Série registrada em pedaços (rest-pause, drop-set, myo-reps, cluster, 3/7):
// o aluno anota cada bloco, vê o total contra a meta e dispara a pausa curta.
import { Icon } from "@/components/ui/Icon";
import { arredondarCarga, somaBlocos, type BlocoPlanejado } from "@/lib/treino/tecnica-config";

export type BlocoDigitado = { carga: string; reps: string };

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(n) ? n : null;
};
const kg = (n: number) => String(n).replace(".", ",");

export function SerieEmBlocos({
  rotulo,
  titulo,
  cor,
  planejados,
  valores,
  cargaRef,
  cargaPorBloco,
  livre,
  alvoTotal,
  concluida,
  sincronizada,
  onChange,
  onConcluir,
  onPausa,
}: {
  rotulo: string;
  titulo: string;
  cor: string;
  planejados: BlocoPlanejado[];
  valores: BlocoDigitado[];
  /** Carga de referência (última vez) para o placeholder. */
  cargaRef?: string | null;
  /** Drop-set: cada bloco tem a sua carga. */
  cargaPorBloco: boolean;
  /** Rest-pause: pode acrescentar pedaços até bater a meta. */
  livre: boolean;
  alvoTotal: number | null;
  concluida: boolean;
  sincronizada: boolean;
  onChange: (v: BlocoDigitado[]) => void;
  onConcluir: () => void;
  onPausa: (seg: number) => void;
}) {
  const n = Math.max(planejados.length, valores.length);
  const linhas = Array.from({ length: n }, (_, i) => valores[i] ?? { carga: "", reps: "" });
  const total = somaBlocos(linhas.map((l) => l.reps));
  const carga0 = num(linhas[0]?.carga) ?? num(cargaRef ?? undefined);
  const mudar = (i: number, patch: Partial<BlocoDigitado>) => onChange(linhas.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const bateuMeta = alvoTotal != null && total >= alvoTotal;

  return (
    <div className="space-y-2 rounded-lg border-l-4 bg-bg/60 p-2.5" style={{ borderLeftColor: cor }}>
      <div className="flex items-center gap-2">
        <span className="grid h-7 min-w-7 place-items-center rounded-md px-1 font-mono text-xs font-bold" style={{ background: `${cor}26`, color: cor }}>
          {rotulo}
        </span>
        <span className="min-w-0 flex-1 text-xs font-bold" style={{ color: cor }}>
          {titulo}
        </span>
        <span className={`font-mono text-xs font-bold ${bateuMeta ? "text-success" : "text-fg-muted"}`} aria-live="polite">
          {alvoTotal != null ? `${total}/${alvoTotal}` : `${total} reps`}
          {bateuMeta ? " ✓" : ""}
        </span>
      </div>

      {!cargaPorBloco ? (
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          Carga (kg)
          <input
            type="text"
            inputMode="decimal"
            value={linhas[0]?.carga ?? ""}
            placeholder={cargaRef ?? "kg"}
            onChange={(e) => mudar(0, { carga: e.target.value })}
            aria-label={`Carga da série ${rotulo} em quilos`}
            className="h-10 w-24 rounded-md border border-border bg-bg px-2 text-center font-mono text-base focus:border-accent"
          />
          <span className="text-[11px] text-fg-subtle">mesma em todos os pedaços</span>
        </label>
      ) : null}

      <ol className="space-y-1.5">
        {linhas.map((l, i) => {
          const p = planejados[i] ?? planejados.at(-1) ?? { rotulo: `Mini ${i}`, meta: "o máx.", pausaAntesSeg: planejados.at(-1)?.pausaAntesSeg ?? 15, fracaoCarga: 1 };
          const sugerida = cargaPorBloco && carga0 != null && i > 0 ? arredondarCarga(carga0 * p.fracaoCarga) : null;
          const rotuloBloco = planejados[i]?.rotulo ?? `Mini ${i}`;
          return (
            <li key={i} className="space-y-1">
              {i > 0 && p.pausaAntesSeg > 0 ? (
                <button type="button" onClick={() => onPausa(p.pausaAntesSeg)} className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1 text-[11px] font-semibold text-fg-muted hover:text-fg">
                  <Icon name="timer" size={12} /> pausa de {p.pausaAntesSeg} s
                </button>
              ) : i > 0 && cargaPorBloco ? (
                <p className="text-center text-[10px] text-fg-subtle">↓ tira o peso e continua, sem descanso</p>
              ) : null}
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                <span className="text-xs font-semibold text-fg-muted">{rotuloBloco}</span>
                {cargaPorBloco ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={l.carga}
                    placeholder={i === 0 ? (cargaRef ?? "kg") : sugerida != null ? kg(sugerida) : "kg"}
                    onChange={(e) => mudar(i, { carga: e.target.value })}
                    aria-label={`Carga de ${rotuloBloco} em quilos`}
                    className="h-10 w-20 rounded-md border border-border bg-bg px-2 text-center font-mono text-base focus:border-accent"
                  />
                ) : null}
                <input
                  type="text"
                  inputMode="numeric"
                  value={l.reps}
                  placeholder={p.meta}
                  onChange={(e) => mudar(i, { reps: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                  aria-label={`Repetições de ${rotuloBloco}`}
                  className="h-10 w-20 rounded-md border border-border bg-bg px-2 text-center font-mono text-base focus:border-accent"
                />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-2">
        {livre ? (
          <button type="button" onClick={() => onChange([...linhas, { carga: "", reps: "" }])} disabled={linhas.length >= 12} className="touch rounded-md border border-border px-3 text-xs font-semibold text-fg-muted hover:text-fg disabled:opacity-40">
            + pedaço
          </button>
        ) : null}
        <button
          type="button"
          onClick={onConcluir}
          className={`touch flex flex-1 items-center justify-center gap-2 rounded-md border text-sm font-bold ${concluida ? (sincronizada ? "border-success bg-success text-bg" : "border-warning bg-warning/80 text-bg") : "border-accent bg-accent text-bg"}`}
          aria-label={concluida ? `Série ${rotulo} registrada; tocar salva de novo` : `Concluir série ${rotulo}`}
        >
          <Icon name="check" size={16} /> {concluida ? "Registrada" : "Concluir"}
        </button>
      </div>
    </div>
  );
}
