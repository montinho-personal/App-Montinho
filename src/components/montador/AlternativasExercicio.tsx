"use client";

// Alternativas de um exercício no montador, num painel por cima da tela
// (bottom sheet no celular). Considera o perfil ATUAL do aluno (equipamentos,
// nível, restrições da anamnese, objetivo e prioridades). Tocar no nome troca;
// o olho riscado oculta a alternativa só para este aluno (dá para desfazer).

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { sugerirSubstituicoes, type ContextoAluno } from "@/lib/biblioteca/substituicao";
import type { Equivalencia, ItemBiblioteca } from "@/lib/biblioteca/tipos";
import { GRUPO_COR } from "@/lib/grupos";
import { useFecharComVoltar } from "@/lib/useFecharComVoltar";

type Props = {
  origem: ItemBiblioteca | null;
  nomeDigitado: string;
  alunoNome: string;
  itens: ItemBiblioteca[];
  equivalencias: Equivalencia[];
  contexto: ContextoAluno;
  /** Ids das alternativas ocultas para este aluno neste exercício. */
  ocultas: Set<string>;
  /** Sem esta função, o botão de ocultar não aparece. */
  onOcultar?: (alternativaId: string, oculta: boolean) => void;
  onTrocar: (item: ItemBiblioteca) => void;
  onFechar: () => void;
};

export function AlternativasExercicio({ origem, nomeDigitado, alunoNome, itens, equivalencias, contexto, ocultas, onOcultar, onTrocar, onFechar }: Props) {
  const [verOcultas, setVerOcultas] = useState(false);
  useFecharComVoltar(true, onFechar);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onFechar]);

  const visiveis = useMemo(() => itens.filter((i) => !ocultas.has(i.id)), [itens, ocultas]);
  const r = useMemo(() => (origem ? sugerirSubstituicoes(origem, visiveis, equivalencias, contexto, 8) : null), [origem, visiveis, equivalencias, contexto]);
  const listaOcultas = useMemo(() => itens.filter((i) => ocultas.has(i.id)), [itens, ocultas]);
  const primeiroNome = alunoNome.split(" ")[0] || "este aluno";

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Alternativas ao exercício">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">⇄ Trocar</p>
            <p className="text-base font-bold leading-tight">{origem?.nome ?? nomeDigitado ?? "Exercício"}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar alternativas" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-fg-muted hover:text-fg">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-2 pb-4">
          {!origem ? (
            <p className="px-3 py-6 text-center text-sm text-fg-muted">“{nomeDigitado || "—"}” não está na biblioteca. Toque no nome e escolha um exercício da lista.</p>
          ) : r && r.sugestoes.length ? (
            <ul className="space-y-1">
              {r.sugestoes.map((s) => (
                <li key={s.item.id} className="flex items-center gap-1">
                  <button type="button" onClick={() => onTrocar(s.item)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-card-hover">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: GRUPO_COR[s.item.grupo] }} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{s.item.nome}</span>
                      {s.alertas.length ? <span className="block text-xs text-warning">⚠ {s.alertas.join(" · ")}</span> : null}
                    </span>
                  </button>
                  {onOcultar ? <button
                    type="button"
                    onClick={() => onOcultar(s.item.id, true)}
                    aria-label={`Ocultar ${s.item.nome} para ${primeiroNome}`}
                    title={`Não mostrar para ${primeiroNome}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-subtle hover:bg-danger/10 hover:text-danger"
                  >
                    <OlhoRiscado />
                  </button> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-fg-muted">Nenhuma alternativa compatível com o perfil atual do aluno.</p>
          )}
          {listaOcultas.length && onOcultar ? (
            <div className="mt-3 border-t border-border px-2 pt-2">
              <button type="button" onClick={() => setVerOcultas((v) => !v)} aria-expanded={verOcultas} className="w-full py-2 text-left text-xs font-semibold text-fg-muted hover:text-fg">
                {listaOcultas.length} oculta(s) para {primeiroNome} {verOcultas ? "▴" : "▾"}
              </button>
              {verOcultas ? (
                <ul className="space-y-1">
                  {listaOcultas.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-fg-subtle">
                      <span className="min-w-0 truncate line-through">{i.nome}</span>
                      <button type="button" onClick={() => onOcultar(i.id, false)} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg-muted hover:text-fg">
                        Mostrar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function OlhoRiscado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.6 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.4 8 2.8 10.1 2 12c1 2.5 5 7 10 7 1.9 0 3.6-.6 5.1-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
}
