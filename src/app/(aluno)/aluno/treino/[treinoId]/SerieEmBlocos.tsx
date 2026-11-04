"use client";

// Série registrada em pedaços (rest-pause, drop-set, myo-reps, cluster, 3/7):
// o aluno anota cada bloco, vê o total contra a meta e dispara a pausa curta.
// Pode pôr ou tirar um drop, uma mini-série ou um bloco na hora.
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { arredondarCarga, somaBlocos, type BlocoPlanejado } from "@/lib/treino/tecnica-config";

export type BlocoDigitado = { carga: string; reps: string };

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(n) ? n : null;
};
const kg = (n: number) => String(n).replace(".", ",");

/** Pausa entre os blocos escolhida pela pessoa (05/11/2026, pedido do Montinho: “tem gente que só quer 10, 15, 20 s”). Fica no aparelho, por técnica. */
export const PAUSAS_RAPIDAS = [10, 15, 20, 30] as const;
const LIMITE_PAUSA: [number, number] = [5, 120];
const chaveLS = (c: string) => `montinho-pausa-blocos:${c}`;
function lerPausa(c: string | undefined): number | null {
  if (!c) return null;
  try {
    const v = Number(localStorage.getItem(chaveLS(c)));
    return Number.isFinite(v) && v >= LIMITE_PAUSA[0] && v <= LIMITE_PAUSA[1] ? v : null;
  } catch {
    return null;
  }
}

export function SerieEmBlocos({
  rotulo,
  titulo,
  cor,
  planejados,
  valores,
  cargaRef,
  cargaPorBloco,
  ajuste,
  planejar,
  alvoTotal,
  concluida,
  sincronizada,
  onChange,
  onConcluir,
  onPausa,
  chavePausa,
}: {
  /** Técnica (rest_pause, cluster…): guarda no aparelho a pausa que a pessoa escolheu. */
  chavePausa?: string;
  rotulo: string;
  titulo: string;
  cor: string;
  planejados: BlocoPlanejado[];
  valores: BlocoDigitado[];
  /** Carga de referência (última vez) para o placeholder. */
  cargaRef?: string | null;
  /** Drop-set: cada bloco tem a sua carga. */
  cargaPorBloco: boolean;
  /** Quanto dá para pôr ou tirar (drop, mini-série, bloco). Sem isso, a quantidade é fixa. */
  ajuste?: { unidade: string; minimo: number; maximo: number } | null;
  /** Os pedaços planejados para outra quantidade (rótulo, meta e carga sugerida de cada um). */
  planejar?: (n: number) => BlocoPlanejado[];
  alvoTotal: number | null;
  concluida: boolean;
  sincronizada: boolean;
  onChange: (v: BlocoDigitado[]) => void;
  onConcluir: () => void;
  onPausa: (seg: number) => void;
}) {
  // Série já registrada volta com os pedaços que o aluno fez (ele pode ter tirado um drop).
  const [qtd, setQtd] = useState(() => (concluida && valores.length ? valores.length : Math.max(planejados.length, valores.length)));
  const n = Math.max(qtd, valores.length);
  const plano = planejar && n !== planejados.length ? planejar(n) : planejados;
  const linhas = Array.from({ length: n }, (_, i) => valores[i] ?? { carga: "", reps: "" });
  const mudarQtd = (nova: number) => {
    if (!ajuste || nova < ajuste.minimo || nova > ajuste.maximo) return;
    setQtd(nova);
    onChange(nova > linhas.length ? [...linhas, ...Array.from({ length: nova - linhas.length }, () => ({ carga: "", reps: "" }))] : linhas.slice(0, nova));
  };
  const total = somaBlocos(linhas.map((l) => l.reps));
  const carga0 = num(linhas[0]?.carga) ?? num(cargaRef ?? undefined);
  const mudar = (i: number, patch: Partial<BlocoDigitado>) => onChange(linhas.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const bateuMeta = alvoTotal != null && total >= alvoTotal;
  // Pausa entre os blocos: a do plano, ou a que a pessoa escolheu (−5/+5 ou 10/15/20/30 s).
  const pausaPlano = plano.find((p, i) => i > 0 && p.pausaAntesSeg > 0)?.pausaAntesSeg ?? 0;
  const [pausaEscolhida, setPausaEscolhida] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o aparelho só existe no navegador
    setPausaEscolhida(lerPausa(chavePausa));
  }, [chavePausa]);
  const pausa = pausaEscolhida ?? pausaPlano;
  const mudarPausa = (seg: number) => {
    const v = Math.min(LIMITE_PAUSA[1], Math.max(LIMITE_PAUSA[0], seg));
    setPausaEscolhida(v);
    try {
      if (chavePausa) localStorage.setItem(chaveLS(chavePausa), String(v));
    } catch {}
  };

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

      {pausaPlano > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-bg/40 px-2 py-1.5 text-[11px]">
          <span className="font-semibold text-fg-muted"><Icon name="timer" size={12} className="mr-0.5 inline" />Pausa entre blocos:</span>
          <button type="button" onClick={() => mudarPausa(pausa - 5)} aria-label="Diminuir a pausa em 5 segundos" className="grid h-7 w-7 place-items-center rounded-md border border-border font-bold">−</button>
          <span className="min-w-[2.5rem] text-center font-mono text-sm font-bold" aria-live="polite">{pausa} s</span>
          <button type="button" onClick={() => mudarPausa(pausa + 5)} aria-label="Aumentar a pausa em 5 segundos" className="grid h-7 w-7 place-items-center rounded-md border border-border font-bold">+</button>
          <span className="flex gap-1">
            {PAUSAS_RAPIDAS.map((v) => (
              <button key={v} type="button" onClick={() => mudarPausa(v)} aria-pressed={pausa === v} className={`h-7 rounded-full border px-2 font-semibold ${pausa === v ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>{v}s</button>
            ))}
          </span>
        </div>
      ) : null}

      <ol className="space-y-1.5">
        {linhas.map((l, i) => {
          const p = plano[i] ?? plano.at(-1) ?? { rotulo: `Mini ${i}`, meta: "o máx.", pausaAntesSeg: plano.at(-1)?.pausaAntesSeg ?? 15, fracaoCarga: 1 };
          const sugerida = cargaPorBloco && carga0 != null && i > 0 ? arredondarCarga(carga0 * p.fracaoCarga) : null;
          const rotuloBloco = plano[i]?.rotulo ?? `Mini ${i}`;
          return (
            <li key={i} className="space-y-1">
              {i > 0 && p.pausaAntesSeg > 0 ? (
                <button type="button" onClick={() => onPausa(pausa)} className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1 text-[11px] font-semibold text-fg-muted hover:text-fg">
                  <Icon name="timer" size={12} /> pausa de {pausa} s
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

      {ajuste ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => mudarQtd(n - 1)} disabled={n <= ajuste.minimo} aria-label={`Tirar um ${ajuste.unidade}`} className="touch flex-1 rounded-md border border-border text-xs font-semibold text-fg-muted hover:text-fg disabled:opacity-40">
            − {ajuste.unidade}
          </button>
          <button type="button" onClick={() => mudarQtd(n + 1)} disabled={n >= ajuste.maximo} aria-label={`Pôr mais um ${ajuste.unidade}`} className="touch flex-1 rounded-md border border-border text-xs font-semibold text-fg-muted hover:text-fg disabled:opacity-40">
            + {ajuste.unidade}
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
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
