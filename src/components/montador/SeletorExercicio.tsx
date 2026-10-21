"use client";

// Campo de nome do exercício no montador com busca na biblioteca.
// Mínimo de cliques: digite parte do nome, sinônimo, músculo ou equipamento,
// ↑/↓ para escolher e Enter para confirmar (Enter sem lista aberta adiciona a
// próxima linha, como antes). Texto livre continua permitido.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GRUPO_COR, GRUPO_LABEL } from "@/lib/grupos";
import { buscarExercicios } from "@/lib/biblioteca/busca";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";

type Props = {
  valor: string;
  /** Exercício da biblioteca já ligado à linha (o nome pode ser um sinônimo). */
  bibliotecaId?: string | null;
  /** Alternativas ocultas para este aluno neste exercício (somem da lista de trocas). */
  ocultas?: Set<string>;
  itens: ItemBiblioteca[];
  favoritos: Set<string>;
  uso: Map<string, number>;
  onTexto: (v: string) => void;
  onEscolher: (item: ItemBiblioteca) => void;
  onEnterLivre: () => void;
  onMover: (dir: -1 | 1) => void;
  placeholder: string;
  ariaLabel: string;
};

export function SeletorExercicio({ valor, bibliotecaId, ocultas, itens, favoritos, uso, onTexto, onEscolher, onEnterLivre, onMover, placeholder, ariaLabel }: Props) {
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  // Ao tocar num exercício já escolhido (sem digitar), a lista mostra trocas do mesmo músculo.
  const [digitou, setDigitou] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atual = useMemo(() => {
    const porId = bibliotecaId ? itens.find((i) => i.id === bibliotecaId) : undefined;
    if (porId) return porId;
    const q = valor.trim().toLowerCase();
    if (q.length < 2) return null;
    return itens.find((i) => i.nome.toLowerCase() === q) ?? buscarExercicios(itens, valor, {}, { limite: 1 })[0]?.item ?? null;
  }, [itens, valor, bibliotecaId]);
  const modoTroca = aberto && !digitou && !!atual;
  const resultados = useMemo(() => {
    if (!aberto) return [];
    if (modoTroca && atual)
      return itens
        .filter((i) => i.grupo === atual.grupo && i.id !== atual.id && !ocultas?.has(i.id))
        .sort((a, b) => Number(favoritos.has(b.id)) - Number(favoritos.has(a.id)) || (uso.get(b.id) ?? 0) - (uso.get(a.id) ?? 0) || a.nome.localeCompare(b.nome))
        .slice(0, 12)
        .map((item) => ({ item, motivo: "mesmo músculo" as string | undefined }));
    return valor.trim().length >= 2 ? buscarExercicios(itens, valor, {}, { favoritos, uso, limite: 8 }) : [];
  }, [aberto, modoTroca, atual, valor, itens, favoritos, uso, ocultas]);
  const mostrar = aberto && resultados.length > 0;

  // A lista fica por cima da página (a tabela do montador rola de lado e cortava a lista).
  useEffect(() => {
    if (!aberto) return;
    const medir = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (!r) return;
      const largura = Math.min(window.innerWidth - 16, Math.max(r.width, 300));
      setRect({ left: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)), top: r.bottom + 2, width: largura });
    };
    medir();
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [aberto]);
  const listaId = `sug-${ariaLabel.replace(/\W+/g, "-")}`;

  function escolher(item: ItemBiblioteca) {
    onEscolher(item);
    setAberto(false);
    // Fecha o teclado no celular; tocar de novo no nome reabre as trocas.
    inputRef.current?.blur();
  }

  return (
    <div className="relative">
      <input
        value={valor}
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={mostrar ? `${listaId}-${destaque}` : undefined}
        ref={inputRef}
        onChange={(e) => {
          onTexto(e.target.value);
          setDigitou(true);
          setAberto(true);
          setDestaque(0);
        }}
        onFocus={(e) => {
          // Selecionado: é só digitar para substituir.
          e.currentTarget.select();
          setDigitou(false);
          setDestaque(0);
          setAberto(true);
        }}
        onBlur={() => setTimeout(() => setAberto(false), 120)}
        onKeyDown={(e) => {
          if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            onMover(e.key === "ArrowUp" ? -1 : 1);
            return;
          }
          if (mostrar && e.key === "ArrowDown") {
            e.preventDefault();
            setDestaque((d) => Math.min(resultados.length - 1, d + 1));
          } else if (mostrar && e.key === "ArrowUp") {
            e.preventDefault();
            setDestaque((d) => Math.max(0, d - 1));
          } else if (e.key === "Escape") {
            setAberto(false);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const exato = resultados.find((r) => r.item.nome.toLowerCase() === valor.trim().toLowerCase());
            if (mostrar && (!exato || modoTroca)) escolher(resultados[Math.min(destaque, resultados.length - 1)].item);
            else {
              if (exato) onEscolher(exato.item);
              setAberto(false);
              onEnterLivre();
            }
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full bg-transparent px-2 py-2.5 text-[13px] font-medium outline-none focus:bg-accent/5"
      />
      {mostrar && rect && typeof document !== "undefined" ? createPortal(
        <ul id={listaId} role="listbox" style={{ position: "fixed", left: rect.left, top: rect.top, width: rect.width }} className="z-[75] max-h-[50vh] overflow-auto rounded-lg border border-accent/40 bg-surface shadow-2xl">
          {modoTroca && atual ? <li className="sticky top-0 border-b border-border bg-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">⇄ Trocar por — {GRUPO_LABEL[atual.grupo]} (ou digite para buscar)</li> : null}
          {resultados.map((r, i) => (
            <li
              key={r.item.id}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={i === destaque}
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(r.item);
              }}
              onMouseEnter={() => setDestaque(i)}
              className={`cursor-pointer px-3 py-2 ${i === destaque ? "bg-accent/15" : ""}`}
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <span className="h-2 w-2 rounded-full" style={{ background: GRUPO_COR[r.item.grupo] }} aria-hidden />
                {favoritos.has(r.item.id) ? <span className="text-accent" aria-label="favorito">★</span> : null}
                {r.item.nome}
              </span>
              <span className="block text-[11px] text-fg-subtle">
                {GRUPO_LABEL[r.item.grupo]}
                {r.motivo && r.motivo !== "nome" ? ` · ${r.motivo}` : ""}
                {uso.get(r.item.id) ? ` · você usou ${uso.get(r.item.id)}×` : ""}
              </span>
            </li>
          ))}
        </ul>,
        document.body
      ) : null}
    </div>
  );
}
