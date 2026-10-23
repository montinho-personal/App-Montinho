"use client";

// “Que exercício é esse?” nos montadores (personal e visitante): miniatura do
// vídeo ao lado do nome; um toque abre o vídeo em tela cheia, sem escolher nem
// sair da lista. Sem vídeo, um “?” mostra como é feito (passos da biblioteca).
// Muita gente não sabe o nome dos aparelhos: ver o movimento resolve.
import { useState } from "react";
import { createPortal } from "react-dom";
import { thumbnailUrl, type VideoSource } from "@/lib/video";
import type { VideoProvider } from "@/lib/supabase/types-extended";
import { VideoTelaCheia } from "./VideoTelaCheia";

export type MidiaExercicio = { provider: string; id: string } | null;

/** Não deixa o toque na miniatura escolher a linha da lista em que ela está. */
const segurar = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

export function VerExercicio({ nome, midia, passos = [], tamanho = "md" }: { nome: string; midia: MidiaExercicio; passos?: string[]; tamanho?: "sm" | "md" }) {
  const [aberto, setAberto] = useState(false);
  const caixa = tamanho === "sm" ? "h-10 w-8" : "h-12 w-9";
  if (!midia && !passos.length) return null;
  const source: VideoSource | null = midia ? { provider: midia.provider as VideoProvider, id: midia.id } : null;
  const thumb = source ? thumbnailUrl(source) : null;
  return (
    <>
      <button
        type="button"
        onMouseDown={segurar}
        onTouchEnd={(e) => {
          segurar(e);
          setAberto(true);
        }}
        onClick={(e) => {
          segurar(e);
          setAberto(true);
        }}
        aria-label={source ? `Ver o vídeo de ${nome}` : `Ver como é ${nome}`}
        title={source ? "Ver o vídeo do exercício" : "Ver como é o exercício"}
        className={`relative ${caixa} shrink-0 overflow-hidden rounded-md border border-accent/40 bg-black`}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <span className={`absolute inset-0 flex items-center justify-center ${thumb ? "bg-black/35" : "bg-card"}`}>
          {source ? (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-white drop-shadow" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <span className="text-sm font-black text-accent" aria-hidden>?</span>
          )}
        </span>
      </button>
      {aberto && source ? <VideoTelaCheia source={source} titulo={nome} onFechar={() => setAberto(false)} rotuloVoltar="Fechar" /> : null}
      {aberto && !source && typeof document !== "undefined"
        ? createPortal(
            <div role="dialog" aria-modal="true" aria-label={`Como é: ${nome}`} className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => setAberto(false)}>
              <div className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-surface p-4" onClick={(e) => e.stopPropagation()}>
                <p className="font-bold">{nome}</p>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-fg-muted">
                  {passos.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
                <p className="text-xs text-fg-subtle">Este exercício ainda não tem vídeo.</p>
                <button type="button" onClick={() => setAberto(false)} className="w-full rounded-lg bg-accent py-2.5 font-bold text-bg">
                  Fechar
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
