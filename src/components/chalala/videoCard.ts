// Card com vídeo (04/11/2026): o vídeo da pessoa vira o fundo e o card “Treino pago”
// vai por cima, quadro a quadro, num <canvas> gravado pelo próprio navegador
// (MediaRecorder). Nada sai do aparelho.
import type { ConfigCard, DadosCard, Op } from "@/lib/chalala/card";
import { MAX_MB_VIDEO, tamanhoGravacao, tipoDeGravacao } from "@/lib/chalala/video";
import { desenhar, desenharFundoFoto, type Ativos } from "./desenhar";

export type VideoAberto = { el: HTMLVideoElement; url: string; w: number; h: number; total: number };

function esperar(el: HTMLVideoElement, evento: "loadedmetadata" | "seeked" | "loadeddata"): Promise<void> {
  return new Promise((ok, erro) => {
    const fim = () => {
      el.removeEventListener(evento, fim);
      el.removeEventListener("error", falha);
      ok();
    };
    const falha = () => {
      el.removeEventListener(evento, fim);
      el.removeEventListener("error", falha);
      erro(new Error("Não foi possível abrir esse vídeo (formato não suportado pelo navegador)."));
    };
    el.addEventListener(evento, fim);
    el.addEventListener("error", falha);
  });
}

function novoVideo(url: string, mudo: boolean): HTMLVideoElement {
  const v = document.createElement("video");
  v.muted = mudo;
  v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.preload = "auto";
  v.src = url;
  return v;
}

/** O aparelho consegue montar o vídeo? */
export function gravacaoSuportada(): boolean {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return false;
  const c = document.createElement("canvas") as HTMLCanvasElement & { captureStream?: unknown };
  return typeof c.captureStream === "function" && !!tipoDeGravacao((t) => MediaRecorder.isTypeSupported(t));
}

export async function abrirVideo(arquivo: File): Promise<VideoAberto> {
  if (!arquivo.type.startsWith("video/")) throw new Error("Escolha um arquivo de vídeo.");
  if (arquivo.size > MAX_MB_VIDEO * 1024 * 1024) throw new Error(`Vídeo muito grande (máx. ${MAX_MB_VIDEO} MB). Corte um trecho menor na galeria.`);
  const url = URL.createObjectURL(arquivo);
  const el = novoVideo(url, true);
  el.loop = true;
  const meta = esperar(el, "loadeddata");
  el.load();
  await meta;
  if (!el.videoWidth || !el.videoHeight) throw new Error("Não foi possível ler esse vídeo.");
  return { el, url, w: el.videoWidth, h: el.videoHeight, total: el.duration };
}

/** Grava o card com o trecho do vídeo e devolve o arquivo (MP4 quando o aparelho deixa). */
export async function gravarVideoCard(o: { url: string; inicio: number; duracao: number; comSom: boolean; cfg: ConfigCard; dados: DadosCard; ativos: Ativos; nomeBase: string; onProgresso?: (p: number) => void }): Promise<File> {
  const tipo = typeof MediaRecorder === "undefined" ? null : tipoDeGravacao((t) => MediaRecorder.isTypeSupported(t));
  if (!tipo) throw new Error("Este celular não consegue montar vídeo pelo app. Use uma foto ou atualize o sistema.");

  // O card (sem o fundo) é desenhado UMA vez; por cima de cada quadro do vídeo.
  const sobre = document.createElement("canvas");
  const layout = desenhar(sobre, o.cfg, o.dados, { ...o.ativos, foto: null, semFundo: true });
  const fundo = layout.ops.find((x): x is Extract<Op, { t: "fundo" }> => x.t === "fundo") ?? { t: "fundo" as const, tipo: "foto" as const, cor: "#000", gradiente: null, escurecer: 0 };
  const tam = tamanhoGravacao(layout.w, layout.h);
  const tela = document.createElement("canvas") as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream };
  tela.width = tam.w;
  tela.height = tam.h;
  const ctx = tela.getContext("2d")!;
  if (typeof tela.captureStream !== "function") throw new Error("Este celular não consegue montar vídeo pelo app. Use uma foto.");

  const v = novoVideo(o.url, !o.comSom);
  const pronto = esperar(v, "loadeddata");
  v.load();
  await pronto;
  const pulo = esperar(v, "seeked");
  v.currentTime = o.inicio;
  await pulo;

  const stream = tela.captureStream(30);
  let audio: AudioContext | null = null;
  if (o.comSom) {
    try {
      audio = new AudioContext();
      const origem = audio.createMediaElementSource(v);
      const destino = audio.createMediaStreamDestination();
      origem.connect(destino);
      destino.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      // Sem áudio neste aparelho: o vídeo sai mudo.
      v.muted = true;
    }
  }

  const quadro = () => {
    ctx.setTransform(tam.escala, 0, 0, tam.escala, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, layout.w, layout.h);
    desenharFundoFoto(ctx, v, v.videoWidth, v.videoHeight, layout, o.cfg, fundo);
    ctx.drawImage(sobre, 0, 0);
  };
  quadro();

  const pedacos: Blob[] = [];
  const gravador = new MediaRecorder(stream, { mimeType: tipo.mime, videoBitsPerSecond: 6_000_000 });
  gravador.ondataavailable = (e) => e.data.size && pedacos.push(e.data);
  const parou = new Promise<void>((ok) => (gravador.onstop = () => ok()));
  gravador.start(250);
  await v.play();
  const fim = o.inicio + o.duracao;
  await new Promise<void>((ok) => {
    const passo = () => {
      quadro();
      o.onProgresso?.(Math.min(1, Math.max(0, (v.currentTime - o.inicio) / Math.max(0.1, o.duracao))));
      if (v.currentTime >= fim || v.ended) return ok();
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
  v.pause();
  gravador.stop();
  await parou;
  stream.getTracks().forEach((t) => t.stop());
  await audio?.close().catch(() => undefined);
  v.removeAttribute("src");
  v.load();
  const blob = new Blob(pedacos, { type: tipo.mime.split(";")[0] });
  if (!blob.size) throw new Error("O vídeo saiu vazio. Tente de novo com o app aberto na tela até terminar.");
  return new File([blob], `${o.nomeBase}.${tipo.ext}`, { type: blob.type });
}
