// ============================================================================
// Montinho Desbloqueia — card “Eu descobri” para Stories (layout PURO).
// Só a pergunta, o veredito e a frase curta: nada de dado pessoal.
// Medição de texto injetada → testável sem canvas.
// ============================================================================

import type { Medir } from "@/lib/chalala/card";
import { CATEGORIAS, type ConteudoConhecimento } from "./tipos";

export const CARD_DESCOBERTA = { w: 1080, h: 1920, margem: 96 };
export const KICKER_DESCOBERTA = "MITO OU VERDADE?";

export type LinhaCard = { texto: string; x: number; y: number; tamanho: number; peso: 400 | 600 | 700 | 800; cor: string };
export type LayoutDescoberta = { linhas: LinhaCard[]; cor: string; selo: { x: number; y: number; w: number; h: number; texto: string } };

/** Quebra em linhas que cabem em `largura`; corta a última com “…”. */
export function quebrar(texto: string, largura: number, medir: Medir, tamanho: number, peso: LinhaCard["peso"], maxLinhas: number): string[] {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const t = atual ? `${atual} ${p}` : p;
    if (medir(t, tamanho, peso) <= largura || !atual) atual = t;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length <= maxLinhas) return linhas;
  const corte = linhas.slice(0, maxLinhas);
  let ultima = corte[maxLinhas - 1];
  while (ultima.length > 1 && medir(`${ultima}…`, tamanho, peso) > largura) ultima = ultima.slice(0, -1).trimEnd();
  corte[maxLinhas - 1] = `${ultima}…`;
  return corte;
}

/** Primeira frase da resposta rápida (o card não vira textão). */
export const fraseCurta = (c: Pick<ConteudoConhecimento, "rapida">) => (c.rapida.match(/^[^.!?]+[.!?]/)?.[0] ?? c.rapida).trim();

export function layoutDescoberta(c: ConteudoConhecimento, medir: Medir): LayoutDescoberta {
  const { w, margem } = CARD_DESCOBERTA;
  const largura = w - margem * 2;
  const cor = CATEGORIAS.find((k) => k.id === c.categoria)?.cor ?? "#ba9e50";
  const linhas: LinhaCard[] = [];
  let y = 520;
  linhas.push({ texto: KICKER_DESCOBERTA, x: margem, y, tamanho: 40, peso: 700, cor });
  y += 90;
  for (const l of quebrar(`“${c.pergunta}”`, largura, medir, 72, 800, 6)) {
    linhas.push({ texto: l, x: margem, y, tamanho: 72, peso: 800, cor: "#f5f5f5" });
    y += 88;
  }
  y += 60;
  const selo = { x: margem, y, w: Math.min(largura, medir(c.veredito, 52, 800) + 80), h: 96, texto: c.veredito };
  y += selo.h + 90;
  for (const l of quebrar(fraseCurta(c), largura, medir, 44, 400, 6)) {
    linhas.push({ texto: l, x: margem, y, tamanho: 44, peso: 400, cor: "#cfcfcf" });
    y += 60;
  }
  linhas.push({ texto: "Descobri no app do Montinho.", x: margem, y: 1680, tamanho: 40, peso: 600, cor });
  linhas.push({ texto: "Montinho Personal Trainer · @montinho_personal", x: margem, y: 1750, tamanho: 34, peso: 400, cor: "#9a9a9a" });
  return { linhas, cor, selo };
}
