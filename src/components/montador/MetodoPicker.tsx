"use client";

// Seletor de método do exercício: botão compacto + painel (bottom sheet no
// celular, caixa centralizada no computador) com busca, grupos e ícones.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Tecnica } from "@/lib/volume/calcular";
import { COR_TECNICA, METODOS, TAMANHO_BLOCO, type GrupoMetodo } from "@/lib/volume/tecnicas";
import { useFecharComVoltar } from "@/lib/useFecharComVoltar";

const ICONE: Record<GrupoMetodo, string> = {
  Básico: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  Progressivos: "M3 17l6-6 4 4 8-8M15 7h6v6",
  Combinados: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  Intensificadores: "M13 2L4 14h7l-1 8 9-12h-7z",
  "Tempo/Técnica": "M12 8v5l3 2M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 2h6",
};

function IconeGrupo({ grupo, size = 18 }: { grupo: GrupoMetodo; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONE[grupo]} />
    </svg>
  );
}

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function MetodoPicker({ valor, onEscolher, titulo = "Método", contexto, compacto = false, rotulo }: { valor: Tecnica | null; onEscolher: (m: Tecnica) => void; titulo?: string; contexto?: string; compacto?: boolean; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const atual = METODOS.find((m) => m.v === valor) ?? null;
  useFecharComVoltar(aberto, () => setAberto(false));

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [aberto]);

  const grupos = useMemo(() => {
    const q = sem(busca.trim());
    const lista = q ? METODOS.filter((m) => sem(`${m.l} ${m.desc} ${m.grupo}`).includes(q)) : METODOS;
    return [...new Set(lista.map((m) => m.grupo))].map((g) => ({ grupo: g, itens: lista.filter((m) => m.grupo === g) }));
  }, [busca]);

  const destacado = !!atual && atual.v !== "normal";
  // Cada método tem a sua cor (bater o olho e saber qual é).
  const cor = atual ? COR_TECNICA[atual.v] : null;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setBusca("");
          setAberto(true);
        }}
        aria-haspopup="dialog"
        title={atual?.desc}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-full border font-semibold transition-colors ${compacto ? "h-7 px-2.5 text-[11px]" : "h-9 px-3 text-xs"} ${destacado ? "border-accent/60 bg-accent/15 text-accent" : "border-border bg-bg text-fg-muted hover:text-fg"}`}
        style={destacado && cor ? { borderColor: `${cor}99`, background: `${cor}26`, color: cor } : undefined}
      >
        {atual ? <IconeGrupo grupo={atual.grupo} size={compacto ? 13 : 15} /> : null}
        <span className="truncate">{rotulo ?? atual?.l ?? "Escolher método"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {aberto
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
              <button type="button" aria-label="Fechar" onClick={() => setAberto(false)} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
              <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-md sm:rounded-2xl">
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
                <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
                  <div>
                    <p className="text-base font-bold">{titulo}</p>
                    {contexto ? <p className="text-xs text-fg-muted">{contexto}</p> : null}
                  </div>
                  <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full border border-border text-fg-muted hover:text-fg">
                    ✕
                  </button>
                </div>
                <div className="px-4 pb-2">
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar método…" aria-label="Buscar método" className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent" />
                </div>
                <div className="overflow-y-auto overscroll-contain px-2 pb-4">
                  {grupos.map(({ grupo, itens }) => (
                    <section key={grupo} className="pt-2">
                      <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">{grupo}</p>
                      <ul className="space-y-1">
                        {itens.map((m) => {
                          const sel = m.v === valor;
                          const liga = TAMANHO_BLOCO[m.v];
                          return (
                            <li key={m.v}>
                              <button
                                type="button"
                                onClick={() => {
                                  onEscolher(m.v);
                                  setAberto(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${sel ? "border-accent/60 bg-accent/10" : "border-transparent hover:bg-card-hover"}`}
                              >
                                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${sel ? "bg-accent text-bg" : "bg-bg text-fg-muted"}`} style={COR_TECNICA[m.v] ? (sel ? { background: COR_TECNICA[m.v]!, color: "#111" } : { color: COR_TECNICA[m.v]!, background: `${COR_TECNICA[m.v]}1f` }) : undefined}>
                                  <IconeGrupo grupo={m.grupo} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className={`block text-sm font-semibold ${sel ? "text-accent" : "text-fg"}`}>{m.l}</span>
                                  <span className="block text-xs text-fg-muted">
                                    {m.desc}
                                    {liga ? ` · liga ${liga} exercícios` : ""}
                                  </span>
                                </span>
                                {sel ? (
                                  <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-bg" aria-label="Selecionado">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
                                      <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                  {!grupos.length ? <p className="px-3 py-6 text-center text-sm text-fg-muted">Nenhum método com esse nome.</p> : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
