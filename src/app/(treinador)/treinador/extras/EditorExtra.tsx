"use client";

// Editor de um treino extra pronto: título, exercícios (trocar, tirar, pôr),
// séries e repetições. Usado nas opções sugeridas e nos extras já aprovados.

import { useMemo, useState } from "react";
import { normalizarNome } from "@/lib/grupos";
import { LIMITES_OPCOES, duracaoEstimada, seriesTotais } from "@/lib/treino/extra-opcoes";
import type { ItemExtraAprovado } from "@/lib/treino/extra";

export type ItemBibliotecaLeve = { id: string; nome: string; grupo: string; busca: string };

const inp = "h-9 rounded-md border border-border bg-bg px-2";

export function EditorExtra({ tituloInicial, itensIniciais, biblioteca, salvando, rotuloBotao, onAprovar, onCancelar }: {
  tituloInicial: string;
  itensIniciais: ItemExtraAprovado[];
  biblioteca: ItemBibliotecaLeve[];
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
  const achados = useMemo(() => {
    const t = normalizarNome(q);
    if (t.length < 2) return [];
    return biblioteca.filter((b) => b.busca.includes(t)).slice(0, 6);
  }, [q, biblioteca]);

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
          <li key={`${x.nome}-${i}`} className="flex flex-wrap items-center gap-1.5 rounded-md border border-border px-2 py-1.5">
            <button type="button" onClick={() => { setBuscando(i); setQ(""); }} className="alvo min-w-0 flex-1 text-left text-sm font-semibold underline-offset-2 hover:underline" title="Trocar exercício">
              {x.nome} <span className="text-[11px] font-normal text-accent">trocar</span>
            </button>
            <label className="flex items-center gap-1 text-xs text-fg-muted">
              <input inputMode="numeric" value={x.series} onChange={(e) => mudar(i, { series: Math.min(LIMITES_OPCOES.maxSeries, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)) })} aria-label={`Séries de ${x.nome}`} className={`${inp} w-11 text-center`} />
              ×
              <input value={x.reps} onChange={(e) => mudar(i, { reps: e.target.value.slice(0, 20) })} aria-label={`Repetições de ${x.nome}`} className={`${inp} w-20 text-center`} />
            </label>
            <button type="button" onClick={() => setItens((l) => l.filter((_, k) => k !== i))} aria-label={`Tirar ${x.nome}`} className="alvo px-1 text-fg-subtle hover:text-red">
              ✕
            </button>
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
