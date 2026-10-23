"use client";

// Vídeo do exercício em tela cheia: um toque abre grande e já tocando;
// fechar no ✕, tocando fora ou no botão “voltar ao treino”. O treino continua
// por baixo (nada é perdido). Formato vertical (Shorts) que se ajusta à tela.
import { useEffect, useState } from "react";
import { useFecharComVoltar } from "@/lib/useFecharComVoltar";
import { createPortal } from "react-dom";
import { embedUrl, thumbnailUrl, type VideoSource } from "@/lib/video";

export function BotaoVideoTelaCheia({ source, titulo }: { source: VideoSource; titulo: string }) {
  const [aberto, setAberto] = useState(false);
  const thumb = thumbnailUrl(source);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="touch flex w-full items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft/40 p-2 text-left hover:border-accent" aria-label={`Ver vídeo de ${titulo}`}>
        <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {thumb ? <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-bg" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        </span>
        <span>
          <span className="block text-sm font-bold text-accent">▶ Ver como fazer</span>
          <span className="block text-xs text-fg-muted">Abre o vídeo em tela cheia</span>
        </span>
      </button>
      {aberto ? <VideoTelaCheia source={source} titulo={titulo} onFechar={() => setAberto(false)} /> : null}
    </>
  );
}

export function VideoTelaCheia({ source, titulo, onFechar, rotuloVoltar = "Voltar ao treino" }: { source: VideoSource; titulo: string; onFechar: () => void; rotuloVoltar?: string }) {
  // Botão “voltar” do celular fecha o vídeo e volta ao treino.
  useFecharComVoltar(true, onFechar);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [onFechar]);
  const src = source.provider === "direct_url" ? source.id : embedUrl(source) + (source.provider === "youtube" ? "&autoplay=1" : "");
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Vídeo: ${titulo}`} className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/95 p-3" onClick={onFechar}>
      <div className="flex w-full max-w-md items-center justify-between gap-3 pb-2" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate text-sm font-bold text-white">{titulo}</p>
        <button type="button" onClick={onFechar} aria-label="Fechar vídeo" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25">✕</button>
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-black" style={{ width: "min(calc(100vw - 24px), calc((100dvh - 150px) * 9 / 16))", aspectRatio: "9 / 16" }} onClick={(e) => e.stopPropagation()}>
        {source.provider === "direct_url" ? (
          <video src={src} controls autoPlay playsInline className="absolute inset-0 h-full w-full" />
        ) : (
          <iframe src={src} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={`Vídeo: ${titulo}`} />
        )}
      </div>
      <button type="button" onClick={onFechar} className="mt-3 rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-bg">{rotuloVoltar}</button>
    </div>,
    document.body,
  );
}
