"use client";

// Editor de um treino extra pronto: título, exercícios (trocar, tirar, pôr),
// séries e repetições. Usado nas opções sugeridas e nos extras já aprovados.

import { useMemo, useState } from "react";
import { normalizarNome } from "@/lib/grupos";
import { LIMITES_OPCOES, duracaoEstimada, seriesTotais } from "@/lib/treino/extra-opcoes";
import type { ItemExtraAprovado } from "@/lib/treino/extra";

export type ItemBibliotecaLeve = { id: string; nome: string; grupo: string; busca: string };

const inp = "h-9 rounded-md border border-border bg-bg px-2";

export function EditorExtra({ tituloInicial, itensIniciais, biblioteca, faixas = [], salvando, rotuloBotao, onAprovar, onCancelar }: {
  tituloInicial: string;
  itensIniciais: ItemExtraAprovado[];
  biblioteca: ItemBibliotecaLeve[];
  /** Faixas de repetições para tocar (as mais usadas + o padrão). */
  faixas?: string[];
  salvando: boolean;
  rotuloBotao: string;
  onAprovar: (titulo: string, itens: ItemExtraAprovado[]) => void;
  onCancelar?: () => void;
}) {
  const [titulo, setTitulo] = useState(tituloInicial.slice(0, 80));
  const [itens, setItens] = useState<ItemExtraAprovado[]>(itensIniciais);
  // null = fechado; -1 = adicionar; i = trocar o exercício i.
  const [buscando, setBuscando] = useState<number | null>(null);
  const [q, setQ] = useState("");
  // Linha com as faixas de repetições abertas (ao tocar no campo de reps).
  const [faixasDe, setFaixasDe] = useState<number | null>(null);
  const achados = useMemo(() => {
    const t = normalizarNome(q);
    if (t.length < 2) return [];
    return biblioteca.filter((b) => b.busca.includes(t)).slice(0, 6);
  }, [q, biblioteca]);

  // Troca de lugar com o vizinho (↑ sobe, ↓ desce).
  const mover = (i: number, dir: -1 | 1) =>
    setItens((l) => {
      const j = i + dir;
      if (j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const mudar = (i: number, p: Partial<ItemExtraAprovado>) => setItens((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)));
  function escolher(b: ItemBibliotecaLeve) {
    if (buscando === -1) setItens((l) => [...l, { biblioteca_id: b.id, nome: b.nome, series: 3, reps: "10-12" }]);
    else if (buscando !== null) mudar(buscando, { biblioteca_id: b.id, nome: b.nome });
    setBuscando(null);
    setQ("");
  }
  const ok = titulo.trim().length > 0 && itens.length > 0 && itens.every((x) => x.reps.trim());

  return (
    <div className="space-y-2">
      <input value={titulo} onChange={(e) => setTitulo(e.target.value.slice(0, 80))} aria-label="Nome do treino extra" className={`${inp} w-full font-semibold`} />
      <ul className="space-y-1.5">
        {itens.map((x, i) => (
          <li key={`${x.nome}-${i}`} className="space-y-1.5 rounded-md border border-border px-2 py-1.5">
            <div className="flex items-start gap-1">
              <span className="mt-0.5 w-5 shrink-0 text-center font-mono text-xs text-fg-subtle">{i + 1}</span>
              <button type="button" onClick={() => { setBuscando(i); setQ(""); }} className="alvo min-w-0 flex-1 text-left text-sm font-semibold" title="Trocar exercício">
                {x.nome} <span className="ml-1 whitespace-nowrap text-[11px] font-normal text-accent underline-offset-2 hover:underline">trocar</span>
              </button>
              <button type="button" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Subir ${x.nome}`} className="alvo grid h-8 w-8 place-items-center rounded-md border border-border text-fg-muted hover:text-fg disabled:opacity-30">
                ↑
              </button>
              <button type="button" disabled={i === itens.length - 1} onClick={() => mover(i, 1)} aria-label={`Descer ${x.nome}`} className="alvo grid h-8 w-8 place-items-center rounded-md border border-border text-fg-muted hover:text-fg disabled:opacity-30">
                ↓
              </button>
              <button type="button" onClick={() => setItens((l) => l.filter((_, k) => k !== i))} aria-label={`Tirar ${x.nome}`} className="alvo px-1 text-fg-subtle hover:text-red">
                ✕
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-fg-muted">
              {/* Lista de 1 a 5: digitar no celular apagava e juntava os números. */}
              <select value={x.series} onChange={(e) => mudar(i, { series: Number(e.target.value) })} aria-label={`Séries de ${x.nome}`} className={`${inp} w-16 text-center`}>
                {Array.from({ length: LIMITES_OPCOES.maxSeries }, (_, k) => k + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              séries ×
              <input value={x.reps} onFocus={() => setFaixasDe(i)} onBlur={() => setTimeout(() => setFaixasDe((f) => (f === i ? null : f)), 150)} onChange={(e) => mudar(i, { reps: e.target.value.slice(0, 20) })} aria-label={`Repetições de ${x.nome}`} className={`${inp} w-28 text-center`} />
              reps
            </div>
            {faixasDe === i && faixas.length ? (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Faixas de repetições para ${x.nome}`}>
                {faixas.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      mudar(i, { reps: f });
                      setFaixasDe(null);
                    }}
                    className={`alvo rounded-full border px-2.5 py-1 font-mono text-xs ${x.reps === f ? "border-accent bg-accent/20 text-accent" : "border-border text-fg-muted hover:border-accent/60 hover:text-fg"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {buscando !== null ? (
        <div className="space-y-1 rounded-md border border-accent/40 p-2">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={buscando === -1 ? "Buscar exercício para adicionar…" : `Trocar “${itens[buscando]?.nome}” por…`} aria-label="Buscar exercício na biblioteca" className={`${inp} w-full`} />
          {achados.map((b) => (
            <button key={b.id} type="button" onClick={() => escolher(b)} className="alvo block w-full rounded px-2 py-1 text-left text-sm hover:bg-accent/10">
              {b.nome} <span className="text-[11px] text-fg-subtle">· {b.grupo.replace(/_/g, " ")}</span>
            </button>
          ))}
          <button type="button" onClick={() => setBuscando(null)} className="text-xs text-fg-muted">
            fechar
          </button>
        </div>
      ) : itens.length < LIMITES_OPCOES.maxExercicios ? (
        <button type="button" onClick={() => { setBuscando(-1); setQ(""); }} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
          + Adicionar exercício
        </button>
      ) : null}
      <p className="text-xs text-fg-muted">≈ {duracaoEstimada(itens)} min · {seriesTotais(itens)} séries</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={salvando || !ok} onClick={() => onAprovar(titulo.trim(), itens)} className="touch rounded-lg bg-accent px-4 py-2 font-bold text-bg disabled:opacity-60">
          {rotuloBotao}
        </button>
        {onCancelar ? (
          <button type="button" onClick={onCancelar} className="text-xs text-fg-muted">
            cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}
