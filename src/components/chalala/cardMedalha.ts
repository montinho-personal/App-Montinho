// Imagem da medalha para Stories/Status (1080×1920), desenhada no aparelho.
// Layout pensado para o Story: nada importante nas faixas de cima e de baixo
// (onde ficam o nome do perfil e a caixa de resposta do Instagram).
import type { CardMedalha } from "@/lib/conquistas/compartilhavel";
import { LOGO_STORY } from "@/lib/desbloqueia/card";
import { carregarSvg, familiaFonte, paraBlob } from "./desenhar";

const W = 1080;
const H = 1920;
const OURO_CLARO = "#e3cd8a";
const OURO = "#ba9e50";
const OURO_ESCURO = "#8a7232";

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maxLinhas: number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(tentativa).width <= largura || !atual) atual = tentativa;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length > maxLinhas) {
    const corte = linhas.slice(0, maxLinhas);
    corte[maxLinhas - 1] = `${corte[maxLinhas - 1].replace(/[\s.,;:]+$/, "")}…`;
    return corte;
  }
  return linhas;
}

/** Escreve centralizado e devolve o y depois do bloco. */
function bloco(ctx: CanvasRenderingContext2D, texto: string, y: number, o: { tamanho: number; peso: number; cor: string; largura?: number; maxLinhas?: number; altura?: number; familia: string; espacamento?: number }): number {
  ctx.font = `${o.peso} ${o.tamanho}px ${o.familia}`;
  ctx.fillStyle = o.cor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  c.letterSpacing = `${o.espacamento ?? 0}px`;
  const linhas = quebrar(ctx, texto, o.largura ?? 900, o.maxLinhas ?? 2);
  const alt = o.altura ?? Math.round(o.tamanho * 1.22);
  linhas.forEach((l, i) => ctx.fillText(l, W / 2, y + i * alt));
  c.letterSpacing = "0px";
  return y + (linhas.length - 1) * alt;
}

export async function gerarImagemMedalha(card: CardMedalha): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const familia = familiaFonte();
  const logo = await carregarSvg("/brand/logo.svg", 469, 321);
  await document.fonts?.ready;

  // Fundo: preto com brilho dourado atrás da medalha.
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);
  const brilho = ctx.createRadialGradient(W / 2, 735, 40, W / 2, 735, 820);
  brilho.addColorStop(0, "rgba(186,158,80,0.42)");
  brilho.addColorStop(0.45, "rgba(186,158,80,0.12)");
  brilho.addColorStop(1, "rgba(10,10,10,0)");
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, W, H);

  // Confete discreto (posições fixas).
  const cores = [OURO_CLARO, OURO, "#4ade80", "#f3e6bd", "#ffffff"];
  // Só ao redor da medalha: nunca em cima da marca nem dos textos.
  for (let k = 0; k < 40; k++) {
    const x = (k * 157) % W;
    const y = 260 + ((k * 263) % 680);
    if (Math.hypot(x - W / 2, y - 735) < 285) continue;
    if (y < 500 && Math.abs(x - W / 2) < 260) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((k * 47) % 180) * (Math.PI / 180));
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = cores[k % cores.length];
    ctx.fillRect(-7, -14, 14, 28);
    ctx.restore();
  }

  // Marca
  // Logo oficial completo (M + MONTINHO / PERSONAL TRAINER), em destaque.
  if (logo) ctx.drawImage(logo, W / 2 - LOGO_STORY.w / 2, LOGO_STORY.y, LOGO_STORY.w, LOGO_STORY.h);

  // Medalha
  const cx = W / 2;
  const cy = 735;
  const r = 195;
  ctx.save();
  ctx.shadowColor = "rgba(227,205,138,0.55)";
  ctx.shadowBlur = 90;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#1c1810";
  ctx.fill();
  ctx.restore();
  const anel = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  // Lendária: anel de fogo (ouro → laranja → vermelho).
  anel.addColorStop(0, card.lendaria ? "#ffe9a8" : OURO_CLARO);
  anel.addColorStop(0.5, card.lendaria ? "#f59e0b" : OURO);
  anel.addColorStop(1, card.lendaria ? "#b91c1c" : OURO_ESCURO);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 34;
  ctx.strokeStyle = anel;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 48, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(186,158,80,0.4)";
  ctx.stroke();
  const longo = card.selo.length > 3;
  ctx.font = `800 ${longo ? 96 : 156}px ${familia}`;
  ctx.fillStyle = "#f3e6bd";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(card.selo, cx, cy + 6);
  ctx.textBaseline = "alphabetic";

  // Textos
  let y = 1035;
  y = bloco(ctx, card.lendaria ? "TROFÉU LENDÁRIO" : "NOVA MEDALHA", y, { tamanho: 34, peso: 700, cor: card.lendaria ? "#f59e0b" : OURO, familia, espacamento: 10, maxLinhas: 1 });
  y = bloco(ctx, card.titulo, y + 92, { tamanho: 80, peso: 800, cor: "#ffffff", familia, maxLinhas: 2 });
  if (card.destaque) y = bloco(ctx, card.destaque, y + 68, { tamanho: 40, peso: 700, cor: OURO_CLARO, familia, maxLinhas: 2 });
  ctx.fillStyle = OURO;
  ctx.fillRect(W / 2 - 40, y + 46, 80, 4);
  y = bloco(ctx, `“${card.frase}”`, y + 130, { tamanho: 54, peso: 700, cor: "#f5f5f5", familia, maxLinhas: 2, largura: 880 });
  if (card.porque) y = bloco(ctx, card.porque, y + 74, { tamanho: 34, peso: 400, cor: "#a3a3a3", familia, maxLinhas: 3, largura: 860, altura: 46 });

  // Rodapé logo abaixo do texto e acima da faixa da caixa de resposta do Story.
  const rodape = Math.min(1700, Math.max(1600, y + 100));
  bloco(ctx, [card.nome, card.data].filter(Boolean).join(" · "), rodape, { tamanho: 32, peso: 600, cor: "#d4d4d4", familia, maxLinhas: 1 });
  bloco(ctx, "@montinho_personal", rodape + 50, { tamanho: 32, peso: 700, cor: OURO, familia, maxLinhas: 1 });

  const blob = await paraBlob(canvas);
  const slug = card.titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return new File([blob], `medalha-${slug || "montinho"}.png`, { type: "image/png" });
}
