"use client";

// Campo de nome do exercício no montador com busca na biblioteca.
// Mínimo de cliques: digite parte do nome, sinônimo, músculo ou equipamento,
// ↑/↓ para escolher e Enter para confirmar (Enter sem lista aberta adiciona a
// próxima linha, como antes). Texto livre continua permitido.

import { useMemo, useState } from "react";
import { GRUPO_COR, GRUPO_LABEL } from "@/lib/grupos";
import { buscarExercicios } from "@/lib/biblioteca/busca";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";

type Props = {
  valor: string;
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

export function SeletorExercicio({ valor, itens, favoritos, uso, onTexto, onEscolher, onEnterLivre, onMover, placeholder, ariaLabel }: Props) {
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const resultados = useMemo(
    () => (aberto && valor.trim().length >= 2 ? buscarExercicios(itens, valor, {}, { favoritos, uso, limite: 8 }) : []),
    [aberto, valor, itens, favoritos, uso]
  );
  const mostrar = aberto && resultados.length > 0;
  const listaId = `sug-${ariaLabel.replace(/\W+/g, "-")}`;

  function escolher(item: ItemBiblioteca) {
    onEscolher(item);
    setAberto(false);
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
        onChange={(e) => {
          onTexto(e.target.value);
          setAberto(true);
          setDestaque(0);
        }}
        onFocus={() => setAberto(true)}
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
            if (mostrar && !exato) escolher(resultados[Math.min(destaque, resultados.length - 1)].item);
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
      {mostrar ? (
        <ul id={listaId} role="listbox" className="absolute left-0 right-0 top-full z-30 max-h-72 overflow-auto rounded-lg border border-border bg-surface shadow-xl">
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
        </ul>
      ) : null}
    </div>
  );
}
