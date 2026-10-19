"use client";

import { useState } from "react";
import { embedUrl, thumbnailUrl, type VideoSource } from "@/lib/video";

type VideoPlayerProps = {
  source: VideoSource;
  thumbnail?: string | null;
  className?: string;
  /** se true, mostra thumbnail e só carrega iframe quando clicar */
  lazy?: boolean;
};

export function VideoPlayer({
  source,
  thumbnail,
  className = "",
  lazy = true,
}: VideoPlayerProps) {
  const [active, setActive] = useState(!lazy);
  const thumb = thumbnail ?? thumbnailUrl(source);

  if (source.provider === "direct_url") {
    return (
      <video
        src={source.id}
        controls
        playsInline
        preload={lazy ? "metadata" : "auto"}
        poster={thumbnail ?? undefined}
        className={`w-full aspect-video bg-black rounded-lg ${className}`}
      />
    );
  }

  if (!active && thumb) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden group ${className}`}
        aria-label="Reproduzir vídeo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-fg ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-fg/80 font-bold bg-black/50 px-2 py-1 rounded">
            {source.provider === "youtube" ? "YouTube" : source.provider}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
      <iframe
        src={embedUrl(source) + (source.provider === "youtube" ? "&autoplay=1" : "")}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Vídeo do exercício"
      />
    </div>
  );
}
