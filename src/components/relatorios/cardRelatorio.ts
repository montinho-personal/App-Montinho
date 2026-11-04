// Imagem dos cards de relatório (evolução, peso, medidas, avaliação física) para
// Stories/Status (1080×1920), desenhada no aparelho. Mesmo visual das medalhas:
// fundo preto com brilho dourado e o logo oficial completo no alto.
// O que entra no card vem das regras puras em src/lib/relatorios/card-relatorio.ts.
import type { CardRelatorio } from "@/lib/relatorios/card-relatorio";
import { LOGO_STORY } from "@/lib/desbloqueia/card";
import { carregarSvg, familiaFonte, paraBlob } from "@/components/chalala/desenhar";

const W = 1080;
const H = 1920;
const OURO_CLARO = "#e3cd8a";
const OURO = "#ba9e50";

function arredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Texto numa linha só, encolhendo a letra até caber. */
function caber(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, o: { tamanho: number; peso: number; cor: string; largura: number; familia: string; alinhar?: CanvasTextAlign; espacamento?: number; minimo?: number }) {
  let t = o.tamanho;
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  c.letterSpacing = `${o.espacamento ?? 0}px`;
  ctx.font = `${o.peso} ${t}px ${o.familia}`;
  while (t > (o.minimo ?? 20) && ctx.measureText(texto).width > o.largura) {
    t -= 2;
    ctx.font = `${o.peso} ${t}px ${o.familia}`;
  }
  ctx.fillStyle = o.cor;
  ctx.textAlign = o.alinhar ?? "center";
  ctx.textBaseline = "alphabetic";
  let s = texto;
  if (ctx.measureText(s).width > o.largura) {
    while (s.length > 1 && ctx.measureText(`${s}…`).width > o.largura) s = s.slice(0, -1);
    s = `${s.trimEnd()}…`;
  }
  ctx.fillText(s, x, y);
  c.letterSpacing = "0px";
}

export async function gerarCardRelatorio(card: CardRelatorio): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const familia = familiaFonte();
  const logo = await carregarSvg("/brand/logo.svg", 469, 321);
  await document.fonts?.ready;

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);
  const brilho = ctx.createRadialGradient(W / 2, 520, 40, W / 2, 620, 900);
  brilho.addColorStop(0, "rgba(186,158,80,0.34)");
  brilho.addColorStop(0.5, "rgba(186,158,80,0.08)");
  brilho.addColorStop(1, "rgba(10,10,10,0)");
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, W, H);

  // Logo oficial completo (M + MONTINHO / PERSONAL TRAINER), em destaque.
  if (logo) ctx.drawImage(logo, W / 2 - LOGO_STORY.w / 2, LOGO_STORY.y, LOGO_STORY.w, LOGO_STORY.h);

  let y = LOGO_STORY.y + LOGO_STORY.h + 110;
  caber(ctx, card.chamada, W / 2, y, { tamanho: 34, peso: 700, cor: OURO, largura: 900, familia, espacamento: 10 });
  y += 100;
  caber(ctx, card.titulo, W / 2, y, { tamanho: 84, peso: 800, cor: "#ffffff", largura: 940, familia, minimo: 48 });
  y += 70;
  caber(ctx, card.sub, W / 2, y, { tamanho: 38, peso: 600, cor: "#d4d4d4", largura: 900, familia });
  y += 40;
  ctx.fillStyle = OURO;
  ctx.fillRect(W / 2 - 40, y, 80, 4);
  y += 50;

  // Números grandes (até 3 caixas lado a lado).
  if (card.numeros.length) {
    const n = card.numeros.length;
    const gap = 24;
    const larg = (960 - gap * (n - 1)) / n;
    const alt = 230;
    card.numeros.forEach((num, i) => {
      const x = 60 + i * (larg + gap);
      arredondado(ctx, x, y, larg, alt, 32);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(186,158,80,0.45)";
      ctx.stroke();
      const cx = x + larg / 2;
      caber(ctx, num.valor, cx, y + 105, { tamanho: n === 1 ? 96 : 68, peso: 800, cor: "#ffffff", largura: larg - 30, familia, minimo: 32 });
      caber(ctx, num.rotulo, cx, y + 155, { tamanho: 32, peso: 500, cor: "#a3a3a3", largura: larg - 30, familia });
      if (num.detalhe) caber(ctx, num.detalhe, cx, y + 200, { tamanho: 30, peso: 700, cor: OURO_CLARO, largura: larg - 30, familia });
    });
    y += alt + 60;
  }

  // Linha do tempo (peso): cor neutra, ponto dourado no último registro.
  if (card.grafico && card.grafico.valores.length >= 2) {
    const v = card.grafico.valores;
    const gx = 110;
    const gw = 860;
    const gh = 320;
    const min = Math.min(...v);
    const max = Math.max(...v);
    const faixa = max - min || 1;
    const px = (i: number) => gx + (gw * i) / (v.length - 1);
    const py = (val: number) => y + 20 + gh - ((val - min) / faixa) * gh;
    arredondado(ctx, 60, y - 20, 960, gh + 140, 32);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.beginPath();
    v.forEach((val, i) => (i ? ctx.lineTo(px(i), py(val)) : ctx.moveTo(px(i), py(val))));
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#d4d4d8";
    ctx.stroke();
    v.forEach((val, i) => {
      ctx.beginPath();
      ctx.arc(px(i), py(val), i === v.length - 1 ? 16 : 8, 0, Math.PI * 2);
      ctx.fillStyle = i === v.length - 1 ? OURO_CLARO : "#d4d4d8";
      ctx.fill();
    });
    caber(ctx, card.grafico.inicio, gx, y + gh + 90, { tamanho: 30, peso: 600, cor: "#a3a3a3", largura: 300, familia, alinhar: "left" });
    caber(ctx, card.grafico.fim, gx + gw, y + gh + 90, { tamanho: 30, peso: 600, cor: "#a3a3a3", largura: 300, familia, alinhar: "right" });
    y += gh + 180;
  }

  // Linhas “antes → agora”.
  const espaco = Math.max(118, Math.min(150, Math.floor((1620 - y) / Math.max(1, card.linhas.length))));
  for (const l of card.linhas) {
    if (y + espaco > 1640) break;
    arredondado(ctx, 60, y, 960, espaco - 18, 26);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    const meio = y + (espaco - 18) / 2;
    caber(ctx, l.titulo, 100, meio - (l.detalhe ? 2 : -12), { tamanho: 36, peso: 700, cor: "#ffffff", largura: 500, familia, alinhar: "left" });
    if (l.detalhe) caber(ctx, l.detalhe, 100, meio + 42, { tamanho: 28, peso: 600, cor: OURO_CLARO, largura: 500, familia, alinhar: "left" });
    caber(ctx, l.valor, 980, meio + 14, { tamanho: 42, peso: 800, cor: OURO_CLARO, largura: 400, familia, alinhar: "right" });
    y += espaco;
  }

  // Rodapé acima da faixa da caixa de resposta do Story.
  const rodape = Math.min(1720, Math.max(1660, y + 60));
  caber(ctx, [card.nome, card.data].filter(Boolean).join(" · "), W / 2, rodape, { tamanho: 32, peso: 600, cor: "#d4d4d4", largura: 900, familia });
  caber(ctx, "@montinho_personal", W / 2, rodape + 50, { tamanho: 32, peso: 700, cor: OURO, largura: 900, familia });

  const blob = await paraBlob(canvas);
  return new File([blob], card.arquivo, { type: "image/png" });
}
