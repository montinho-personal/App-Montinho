// Utilitários para lidar com providers de vídeo (YouTube, Cloudflare Stream).
// O usuário pode colar qualquer URL — extraímos o ID e o provider.

import type { VideoProvider } from "@/lib/supabase/types-extended";

export type VideoSource = {
  provider: VideoProvider;
  id: string;
};

/**
 * Detecta o provider e extrai o ID a partir de qualquer URL ou ID solto.
 * Aceita:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - https://www.youtube.com/shorts/VIDEO_ID
 *  - https://customer-XXXX.cloudflarestream.com/VIDEO_UID/iframe
 *  - https://watch.cloudflarestream.com/VIDEO_UID
 *  - Apenas o ID puro (11 chars YouTube ou 32 chars Stream)
 */
export function parseVideoSource(input: string | null | undefined): VideoSource | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;

  // YouTube URL com watch?v=
  const youtubeWatch = value.match(/youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/);
  if (youtubeWatch) return { provider: "youtube", id: youtubeWatch[1] };

  // youtu.be short
  const youtubeShort = value.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (youtubeShort) return { provider: "youtube", id: youtubeShort[1] };

  // YouTube embed
  const youtubeEmbed = value.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if (youtubeEmbed) return { provider: "youtube", id: youtubeEmbed[1] };

  // YouTube Shorts
  const youtubeShorts = value.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  if (youtubeShorts) return { provider: "youtube", id: youtubeShorts[1] };

  // Cloudflare Stream
  const cfStream = value.match(/cloudflarestream\.com\/([A-Za-z0-9]{32})/);
  if (cfStream) return { provider: "cloudflare_stream", id: cfStream[1] };

  // ID puro de 11 chars = YouTube
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) {
    return { provider: "youtube", id: value };
  }

  // ID puro de 32 chars = Cloudflare Stream
  if (/^[A-Za-z0-9]{32}$/.test(value)) {
    return { provider: "cloudflare_stream", id: value };
  }

  // URL direta (mp4)
  if (/^https?:\/\/.+\.(mp4|webm|mov)(\?.*)?$/i.test(value)) {
    return { provider: "direct_url", id: value };
  }

  return null;
}

/** URL do embed pro iframe */
export function embedUrl(source: VideoSource): string {
  switch (source.provider) {
    case "youtube":
      return `https://www.youtube.com/embed/${source.id}?rel=0&modestbranding=1&playsinline=1`;
    case "cloudflare_stream":
      return `https://iframe.cloudflarestream.com/${source.id}?preload=metadata`;
    case "mux":
      return `https://stream.mux.com/${source.id}.m3u8`;
    case "direct_url":
      return source.id;
  }
}

/** URL do thumbnail pra mostrar antes de carregar o player */
export function thumbnailUrl(source: VideoSource): string | null {
  switch (source.provider) {
    case "youtube":
      // hqdefault sempre existe; maxres pode não existir em vídeos antigos
      return `https://i.ytimg.com/vi/${source.id}/hqdefault.jpg`;
    case "cloudflare_stream":
      return `https://customer-${process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER ?? "unknown"}.cloudflarestream.com/${source.id}/thumbnails/thumbnail.jpg`;
    case "mux":
      return `https://image.mux.com/${source.id}/thumbnail.jpg`;
    case "direct_url":
      return null;
  }
}
