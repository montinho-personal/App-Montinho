// Renderização do card no <canvas> (cliente). Recebe as operações do layout
// puro (src/lib/chalala/card.ts): prévia e exportação usam o mesmo caminho.

import { enquadrarFoto, layoutCard, type ConfigCard, type DadosCard, type Medir, type Op, type Peso, type ResultadoLayout } from "@/lib/chalala/card";

export type Ativos = { logoClaro: HTMLImageElement | null; logoEscuro: HTMLImageElement | null; foto: CanvasImageSource | null; fotoW: number; fotoH: number };

export function familiaFonte(): string {
  if (typeof document === "undefined") return "sans-serif";
  const f = getComputedStyle(document.body).fontFamily;
  return f || "sans-serif";
}

export function medidorCanvas(ctx: CanvasRenderingContext2D, familia: string): Medir {
  return (texto: string, tamanho: number, peso: Peso) => {
    ctx.font = `${peso} ${tamanho}px ${familia}`;
    return ctx.measureText(texto).width;
  };
}

const imagens = new Map<string, Promise<HTMLImageElement | null>>();

/** Carrega um SVG da marca com tamanho intrínseco (alguns navegadores exigem). */
export function carregarSvg(src: string, w: number, h: number): Promise<HTMLImageElement | null> {
  const k = `${src}@${w}x${h}`;
  if (!imagens.has(k)) {
    imagens.set(
      k,
      fetch(src)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error("logo"))))
        .then((txt) => {
          const comTamanho = txt.replace(/<svg\b([^>]*)>/, (m, attrs: string) => (/\swidth=/.test(attrs) ? m : `<svg${attrs} width="${w}" height="${h}">`));
          const url = URL.createObjectURL(new Blob([comTamanho], { type: "image/svg+xml" }));
          return new Promise<HTMLImageElement | null>((ok) => {
            const img = new Image();
            img.onload = () => ok(img);
            img.onerror = () => ok(null);
            img.src = url;
          });
        })
        .catch(() => null)
    );
  }
  return imagens.get(k)!;
}

const LIMITE_FOTO = 2400;

/** Lê a foto localmente (nada é enviado ao servidor) e reduz fotos muito grandes. */
export async function prepararFoto(arquivo: File): Promise<{ imagem: CanvasImageSource; w: number; h: number }> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (arquivo.size > 30 * 1024 * 1024) throw new Error("Foto muito grande (máx. 30 MB).");
  let fonte: ImageBitmap | HTMLImageElement;
  try {
    fonte = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(arquivo);
    fonte = await new Promise<HTMLImageElement>((ok, erro) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => erro(new Error("Não foi possível abrir essa foto (formato não suportado pelo navegador)."));
      img.src = url;
    });
  }
  const w0 = "naturalWidth" in fonte ? fonte.naturalWidth : fonte.width;
  const h0 = "naturalHeight" in fonte ? fonte.naturalHeight : fonte.height;
  const escala = Math.min(1, LIMITE_FOTO / Math.max(w0, h0));
  if (escala >= 1) return { imagem: fonte, w: w0, h: h0 };
  const c = document.createElement("canvas");
  c.width = Math.round(w0 * escala);
  c.height = Math.round(h0 * escala);
  c.getContext("2d")!.drawImage(fonte, 0, 0, c.width, c.height);
  if ("close" in fonte) fonte.close();
  return { imagem: c, w: c.width, h: c.height };
}

function retanguloArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function desenhar(canvas: HTMLCanvasElement, cfg: ConfigCard, dados: DadosCard, ativos: Ativos): ResultadoLayout {
  const familia = familiaFonte();
  const ctx = canvas.getContext("2d")!;
  const layout = layoutCard(cfg, dados, medidorCanvas(ctx, familia));
  canvas.width = layout.w;
  canvas.height = layout.h;
  ctx.clearRect(0, 0, layout.w, layout.h);
  for (const op of layout.ops) desenharOp(ctx, op, layout, cfg, ativos, familia);
  return layout;
}

function desenharOp(ctx: CanvasRenderingContext2D, op: Op, l: ResultadoLayout, cfg: ConfigCard, a: Ativos, familia: string) {
  ctx.save();
  switch (op.t) {
    case "fundo": {
      if (op.tipo === "transparente") break;
      if (op.tipo === "foto" && a.foto) {
        const e = enquadrarFoto({ w: a.fotoW, h: a.fotoH }, { w: l.w, h: l.h }, cfg.foto);
        ctx.drawImage(a.foto, e.sx, e.sy, e.sw, e.sh, 0, 0, l.w, l.h);
        if (op.escurecer > 0) {
          ctx.fillStyle = `rgba(0,0,0,${op.escurecer})`;
          ctx.fillRect(0, 0, l.w, l.h);
        }
        // Como nos apps de treino (Strava, Nike): a foto fica clara e o meio livre;
        // só o topo (logo) e a faixa de baixo (textos) ganham um degradê para ler.
        const topo = ctx.createLinearGradient(0, 0, 0, l.h * 0.2);
        topo.addColorStop(0, "rgba(0,0,0,0.55)");
        topo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = topo;
        ctx.fillRect(0, 0, l.w, l.h * 0.2);
        const ini = op.faixaBase ?? 0.55;
        const base = ctx.createLinearGradient(0, l.h * ini, 0, l.h);
        base.addColorStop(0, "rgba(0,0,0,0)");
        base.addColorStop(0.35, "rgba(0,0,0,0.55)");
        base.addColorStop(1, "rgba(0,0,0,0.88)");
        ctx.fillStyle = base;
        ctx.fillRect(0, l.h * ini, l.w, l.h * (1 - ini));
        break;
      }
      if (op.gradiente) {
        const g = ctx.createRadialGradient(l.w / 2, l.h * 0.38, l.w * 0.05, l.w / 2, l.h * 0.45, Math.max(l.w, l.h) * 0.75);
        g.addColorStop(0, op.gradiente[0]);
        g.addColorStop(1, op.gradiente[1]);
        ctx.fillStyle = g;
      } else ctx.fillStyle = op.cor;
      ctx.fillRect(0, 0, l.w, l.h);
      break;
    }
    case "logo": {
      const img = op.variante === "claro" ? a.logoClaro : a.logoEscuro;
      if (img) ctx.drawImage(img, op.x, op.y, op.w, op.h);
      break;
    }
    case "linha":
      ctx.fillStyle = op.cor;
      retanguloArredondado(ctx, op.x, op.y, op.w, 5, 2.5);
      ctx.fill();
      break;
    case "barra":
      ctx.fillStyle = op.trilho;
      retanguloArredondado(ctx, op.x, op.y, op.w, op.h, op.h / 2);
      ctx.fill();
      if (op.progresso > 0) {
        ctx.fillStyle = op.cor;
        retanguloArredondado(ctx, op.x, op.y, Math.max(op.h, op.w * op.progresso), op.h, op.h / 2);
        ctx.fill();
      }
      break;
    case "medalha": {
      const cy = op.y + op.r;
      ctx.beginPath();
      ctx.arc(op.x, cy, op.r - op.r * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = op.fundo;
      ctx.fill();
      ctx.lineWidth = op.r * 0.14;
      ctx.strokeStyle = op.cor;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(op.x, cy, op.r * 0.72, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, op.r * 0.02);
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.globalAlpha = 1;
      const tam = Math.round(op.r * (op.selo.length > 3 ? 0.42 : 0.62));
      ctx.font = `800 ${tam}px ${familia}`;
      ctx.fillStyle = op.texto;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(op.selo, op.x, cy, op.r * 1.5);
      break;
    }
    case "texto":
      ctx.font = `${op.peso} ${op.tamanho}px ${familia}`;
      ctx.fillStyle = op.cor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      if (op.sombra) {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = Math.round(op.tamanho * 0.35);
        ctx.shadowOffsetY = 2;
      }
      op.linhas.forEach((linha, i) => ctx.fillText(linha, op.x, op.y + i * op.alturaLinha, op.maxLargura));
      break;
  }
  ctx.restore();
}

export function paraBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao gerar a imagem"))), "image/png"));
}
