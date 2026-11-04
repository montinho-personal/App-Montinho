"use client";

import { useState } from "react";

/**
 * Vídeo vertical (Short do YouTube) com capa própria: mostra a imagem que
 * desenhamos, a mesma do YouTube, e só carrega o player quando o aluno toca.
 * A capa já traz o "Assistir" desenhado, por isso não há botão por cima.
 */
export function VideoVerticalComCapa({ embed, capa, titulo, className = "" }: { embed: string; capa: string; titulo: string; className?: string }) {
  const [tocando, setTocando] = useState(false);
  return (
    <div className={`relative aspect-[9/16] overflow-hidden bg-black ${className}`}>
      {tocando ? (
        <iframe
          src={`${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`}
          title={titulo}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setTocando(true)} aria-label={`Assistir: ${titulo}`} className="absolute inset-0 h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capa} alt="" className="h-full w-full object-cover" />
        </button>
      )}
    </div>
  );
}
