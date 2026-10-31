"use client";

// Bi-set/tri-set no montador: caixinhas para marcar COM QUAL exercício juntar
// (pedido do Montinho, 31/10/2026). Antes ligava sempre ao seguinte.
// Os marcados vão para logo depois do exercício escolhido (lib/treino/metodo#juntarEmBloco).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFecharComVoltar } from "@/lib/useFecharComVoltar";

export type OpcaoParceiro = { key: string; numero: number; nome: string; bloco?: string | null };

export function EscolherParceirosBloco({
  metodo,
  precisa,
  ancora,
  opcoes,
  inicial,
  cor,
  onConfirmar,
  onCancelar,
}: {
  metodo: string;
  /** Quantos parceiros o método pede (bi-set 1, tri-set 2). */
  precisa: number;
  ancora: { numero: number; nome: string };
  opcoes: OpcaoParceiro[];
  inicial: string[];
  cor?: string | null;
  onConfirmar: (keys: string[]) => void;
  onCancelar: () => void;
}) {
  const [marcados, setMarcados] = useState<string[]>(() => inicial.filter((k) => opcoes.some((o) => o.key === k)).slice(0, precisa));
  // A lista de métodos acabou de fechar com um “voltar” no histórico: só passa
  // a fechar com o voltar do celular depois que ele chegou.
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmado(true), 400);
    return () => clearTimeout(t);
  }, []);
  useFecharComVoltar(armado, onCancelar);

  const cancelarRef = useRef(onCancelar);
  useEffect(() => {
    cancelarRef.current = onCancelar;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancelarRef.current();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  // Já marcou o suficiente e tocou em outro: troca o mais antigo pelo novo.
  const alternar = (key: string) =>
    setMarcados((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : cur.length >= precisa ? [...cur.slice(1), key] : [...cur, key]));

  const falta = precisa - marcados.length;
  const ordem = opcoes.filter((o) => marcados.includes(o.key));
  const destaque = cor ?? "var(--color-accent)";

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Com qual exercício fazer o ${metodo}`}>
      <button type="button" aria-label="Fechar" onClick={onCancelar} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
          <div>
            <p className="text-base font-bold">🔗 {metodo}: com qual exercício?</p>
            <p className="text-xs text-fg-muted">
              Marque {precisa === 1 ? "o exercício" : `os ${precisa} exercícios`} para fazer junto com <b className="text-fg">{ancora.numero}. {ancora.nome || "este exercício"}</b>. {precisa === 1 ? "Ele vai" : "Eles vão"} para logo depois dele no treino.
            </p>
          </div>
          <button type="button" onClick={onCancelar} aria-label="Fechar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-fg-muted hover:text-fg">
            ✕
          </button>
        </div>
        <ul className="space-y-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {opcoes.map((o) => {
            const sel = marcados.includes(o.key);
            return (
              <li key={o.key}>
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${sel ? "border-accent/60 bg-accent/10" : "border-transparent hover:bg-card-hover"}`} style={sel ? { borderColor: destaque } : undefined}>
                  <input type="checkbox" checked={sel} onChange={() => alternar(o.key)} className="h-5 w-5 shrink-0 accent-[var(--color-accent)]" aria-label={`Juntar ${o.nome}`} />
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bg font-mono text-xs font-bold text-fg-muted">{o.numero}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{o.nome}</span>
                    {o.bloco ? <span className="block text-[11px] text-fg-subtle">já está no bloco {o.bloco} (sai de lá)</span> : null}
                  </span>
                </label>
              </li>
            );
          })}
          {!opcoes.length ? <p className="px-3 py-6 text-center text-sm text-fg-muted">Coloque outro exercício neste treino para juntar.</p> : null}
        </ul>
        <div className="border-t border-border px-4 pb-4 pt-3">
          {ordem.length ? (
            <p className="mb-2 text-xs text-fg-muted">
              Vai ficar: <b className="text-fg">{[ancora.nome || `exercício ${ancora.numero}`, ...ordem.map((o) => o.nome)].map((n, i) => `${String.fromCharCode(65 + i)}. ${n}`).join(" + ")}</b>
            </p>
          ) : null}
          <button type="button" disabled={falta > 0} onClick={() => onConfirmar(marcados)} className="h-11 w-full rounded-xl bg-accent text-sm font-bold text-bg disabled:opacity-40">
            {falta > 0 ? `Marque mais ${falta}` : `Juntar em ${metodo}`}
          </button>
          <button type="button" onClick={onCancelar} className="mt-2 h-9 w-full text-xs font-semibold text-fg-muted hover:text-fg">
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
