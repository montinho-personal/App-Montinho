// Card especial “PASSEI O MONTINHO!” (pedido do Montinho, 01/11/2026: “um card
// bem legal, diferente, que motive a compartilhar”). Story 1080×1920 com o
// logo oficial completo: chamada grande, “pódio” da ultrapassagem (a pessoa no
// degrau mais alto com a coroa, o Montinho embaixo), o placar de troféus quando
// a tela tem os números, e o convite para quem vê (“Duvido você passar ele”).
import type { CardMedalha } from "@/lib/conquistas/compartilhavel";
import { LOGO_STORY } from "@/lib/desbloqueia/card";
import { carregarSvg, familiaFonte, paraBlob } from "./desenhar";

const W = 1080;
const H = 1920;
const OURO_CLARO = "#e3cd8a";
const OURO = "#ba9e50";
const OURO_ESCURO = "#8a7232";

function texto(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, o: { tamanho: number; peso: number; cor: string | CanvasGradient; familia: string; espacamento?: number; largura?: number }) {
  ctx.font = `${o.peso} ${o.tamanho}px ${o.familia}`;
  ctx.fillStyle = o.cor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  c.letterSpacing = `${o.espacamento ?? 0}px`;
  // Encolhe até caber na largura (nome comprido não vaza).
  let tam = o.tamanho;
  while (o.largura && tam > 20 && ctx.measureText(t).width > o.largura) {
    tam -= 2;
    ctx.font = `${o.peso} ${tam}px ${o.familia}`;
  }
  ctx.fillText(t, x, y);
  c.letterSpacing = "0px";
}

function degrau(ctx: CanvasRenderingContext2D, x: number, topo: number, base: number, larg: number, fill: string | CanvasGradient) {
  const r = 26;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, topo + r);
  ctx.quadraticCurveTo(x, topo, x + r, topo);
  ctx.lineTo(x + larg - r, topo);
  ctx.quadraticCurveTo(x + larg, topo, x + larg, topo + r);
  ctx.lineTo(x + larg, base);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export async function gerarCardPasseiMontinho(card: CardMedalha): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const familia = familiaFonte();
  const logo = await carregarSvg("/brand/logo.svg", 469, 321);
  await document.fonts?.ready;

  // Fundo: preto + faixas diagonais douradas (clima de ultrapassagem) + brilho atrás do pódio.
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.42);
  for (let i = -12; i <= 12; i++) {
    ctx.fillStyle = i % 3 === 0 ? "rgba(186,158,80,0.10)" : "rgba(186,158,80,0.04)";
    ctx.fillRect(i * 120, -H, i % 3 === 0 ? 46 : 18, H * 2);
  }
  ctx.restore();
  const brilho = ctx.createRadialGradient(W / 2, 1180, 60, W / 2, 1180, 760);
  brilho.addColorStop(0, "rgba(227,205,138,0.30)");
  brilho.addColorStop(1, "rgba(10,10,10,0)");
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, W, H);

  // Logo oficial completo.
  if (logo) ctx.drawImage(logo, W / 2 - LOGO_STORY.w / 2, LOGO_STORY.y, LOGO_STORY.w, LOGO_STORY.h);

  // Chamada.
  texto(ctx, "ULTRAPASSAGEM NO RANKING", W / 2, 560, { tamanho: 34, peso: 700, cor: OURO, familia, espacamento: 8 });
  texto(ctx, "PASSEI O", W / 2, 690, { tamanho: 118, peso: 900, cor: "#ffffff", familia });
  const ouro = ctx.createLinearGradient(0, 720, 0, 850);
  ouro.addColorStop(0, "#fff1c4");
  ouro.addColorStop(0.55, OURO_CLARO);
  ouro.addColorStop(1, OURO);
  ctx.save();
  ctx.shadowColor = "rgba(227,205,138,0.55)";
  ctx.shadowBlur = 40;
  texto(ctx, "MONTINHO!", W / 2, 840, { tamanho: 150, peso: 900, cor: ouro, familia, largura: 980 });
  ctx.restore();

  // Pódio: a pessoa no alto (coroa), o Montinho no degrau de baixo.
  const base = 1400;
  const larg = 330;
  const xEu = 150;
  const xM = W - 150 - larg;
  const topoEu = 1080;
  const topoM = 1220;
  const gEu = ctx.createLinearGradient(0, topoEu, 0, base);
  gEu.addColorStop(0, OURO_CLARO);
  gEu.addColorStop(1, OURO_ESCURO);
  degrau(ctx, xEu, topoEu, base, larg, gEu);
  degrau(ctx, xM, topoM, base, larg, "#3a3a3f");

  const nome = card.nome || "Eu";
  ctx.font = `400 96px ${familia}`;
  ctx.textAlign = "center";
  ctx.fillText("👑", xEu + larg / 2, topoEu - 92);
  texto(ctx, nome, xEu + larg / 2, topoEu - 28, { tamanho: 50, peso: 800, cor: "#ffffff", familia, largura: larg + 40 });
  texto(ctx, "Montinho 😅", xM + larg / 2, topoM - 28, { tamanho: 42, peso: 700, cor: "#cfcfcf", familia, largura: larg + 40 });

  const p = card.placar;
  if (p) {
    texto(ctx, String(p.eu), xEu + larg / 2, topoEu + 150, { tamanho: 130, peso: 900, cor: "#1a1408", familia });
    texto(ctx, "troféus", xEu + larg / 2, topoEu + 205, { tamanho: 36, peso: 700, cor: "#2a2010", familia });
    texto(ctx, String(p.montinho), xM + larg / 2, topoM + 120, { tamanho: 96, peso: 900, cor: "#e5e5e5", familia });
    texto(ctx, "troféus", xM + larg / 2, topoM + 165, { tamanho: 32, peso: 700, cor: "#bdbdbd", familia });
  } else {
    texto(ctx, "1º", xEu + larg / 2, topoEu + 170, { tamanho: 150, peso: 900, cor: "#1a1408", familia });
    texto(ctx, "2º", xM + larg / 2, topoM + 130, { tamanho: 110, peso: 900, cor: "#e5e5e5", familia });
  }
  // Seta da ultrapassagem entre os degraus.
  ctx.save();
  ctx.strokeStyle = OURO_CLARO;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(W / 2 + 40, 1250);
  ctx.quadraticCurveTo(W / 2, 1150, W / 2 - 45, 1130);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 45, 1130);
  ctx.lineTo(W / 2 - 15, 1108);
  ctx.moveTo(W / 2 - 45, 1130);
  ctx.lineTo(W / 2 - 18, 1155);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = OURO;
  ctx.fillRect(110, base, W - 220, 8);

  // Recado + provocação para quem vê o Story.
  texto(ctx, "Meu personal treina pelo app também…", W / 2, 1500, { tamanho: 40, peso: 500, cor: "#e5e5e5", familia, largura: 900 });
  texto(ctx, "e ficou para trás! 😎", W / 2, 1572, { tamanho: 58, peso: 800, cor: "#ffffff", familia, largura: 900 });
  texto(ctx, "Duvido você passar ele também 👀", W / 2, 1640, { tamanho: 38, peso: 700, cor: OURO_CLARO, familia, largura: 900 });

  // Rodapé.
  texto(ctx, [card.nome, card.data].filter(Boolean).join(" · "), W / 2, 1708, { tamanho: 30, peso: 600, cor: "#bdbdbd", familia });
  texto(ctx, "@montinho_personal", W / 2, 1752, { tamanho: 32, peso: 700, cor: OURO, familia });

  const blob = await paraBlob(canvas);
  return new File([blob], "passei-o-montinho.png", { type: "image/png" });
}
