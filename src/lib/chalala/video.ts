// Card com VÍDEO (pedido do Montinho, 04/11/2026: “é possível colocar vídeo também?”;
// começa pelo card “Treino pago”). Regras puras: trecho escolhido, tamanho da
// gravação e o tipo de arquivo que o aparelho consegue gerar. Tudo é feito no
// próprio celular; nada vai para o servidor.

/** Duração máxima do vídeo do card (o tamanho de um Story). */
export const MAX_SEGUNDOS_VIDEO = 15;
/** Tamanho máximo do arquivo escolhido. */
export const MAX_MB_VIDEO = 200;
/** Largura da gravação: o card é desenhado em 1080 e reduzido para o celular aguentar. */
export const LARGURA_GRAVACAO = 720;

/** Trecho que vai para o card: começa em `inicio` (dentro do vídeo) e dura até 15 s. */
export function trechoDoVideo(total: number, inicio: number, max = MAX_SEGUNDOS_VIDEO): { inicio: number; duracao: number } {
  const t = Number.isFinite(total) && total > 0 ? total : 0;
  const ini = Math.max(0, Math.min(Math.max(0, t - 1), Number.isFinite(inicio) ? inicio : 0));
  return { inicio: Math.round(ini * 10) / 10, duracao: Math.round(Math.max(0, Math.min(max, t - ini)) * 10) / 10 };
}

/** Tipos de vídeo, do melhor (MP4, aceito em todo lugar) ao que sobrar. */
export const TIPOS_VIDEO = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

export function tipoDeGravacao(suporta: (t: string) => boolean): { mime: string; ext: "mp4" | "webm" } | null {
  for (const t of TIPOS_VIDEO) {
    try {
      if (suporta(t)) return { mime: t, ext: t.startsWith("video/mp4") ? "mp4" : "webm" };
    } catch {
      // segue para o próximo
    }
  }
  return null;
}

/** Tamanho da gravação mantendo a proporção do card. */
export function tamanhoGravacao(w: number, h: number, largura = LARGURA_GRAVACAO): { w: number; h: number; escala: number } {
  const escala = Math.min(1, largura / w);
  // Codificadores de vídeo pedem lados pares.
  const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return { w: par(w * escala), h: par(h * escala), escala };
}

/** “0:07” */
export const segundosTexto = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
