// ============================================================================
// Montinho Desbloqueia — card “Eu descobri” para Stories (layout PURO).
// Só a pergunta, o veredito e a frase curta: nada de dado pessoal.
// Medição de texto injetada → testável sem canvas.
// ============================================================================

import type { Medir } from "@/lib/chalala/card";
import { CATEGORIAS, type ConteudoConhecimento } from "./tipos";

export const CARD_DESCOBERTA = { w: 1080, h: 1920, margem: 96 };
/** Padrão da marca em todo card de Story: logo oficial centralizado no topo. */
export const LOGO_STORY = { w: 400, h: 274, y: 200 };
export const KICKER_DESCOBERTA = "MITO OU VERDADE?";

export type LinhaCard = { texto: string; x: number; y: number; tamanho: number; peso: 400 | 600 | 700 | 800; cor: string };
export type LayoutDescoberta = { linhas: LinhaCard[]; cor: string; /** Selo MITO/VERDADE: cor de fundo, cor e tamanho da letra. */ selo: { x: number; y: number; w: number; h: number; texto: string; fundo: string; corTexto: string; tamanho: number }; logo: { x: number; y: number; w: number; h: number }; barra: { x: number; y: number; w: number; h: number } };

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

/** Primeira frase da resposta rápida (resumo usado em avisos curtos). */
export const fraseCurta = (c: Pick<ConteudoConhecimento, "rapida">) => (c.rapida.match(/^[^.!?]+[.!?]/)?.[0] ?? c.rapida).trim();

/** Cor do selo pelo veredito: MITO vermelho, VERDADE verde, “com contexto” dourado (marca). */
export function corDoVeredito(veredito: string): string {
  const v = veredito.toUpperCase();
  if (v.startsWith("MITO")) return "#e5484d";
  if (v.includes("CONTEXTO") || v.includes("DEPENDE")) return "#ba9e50";
  return "#30a46c";
}

/**
 * Card “Mito ou verdade?” (pedido do Montinho, 29/10/2026): pergunta, selo
 * MITO/VERDADE bem claro e a explicação COMPLETA (resposta + “Na prática”).
 * O tamanho das letras se ajusta sozinho para caber tudo, sem cortar texto.
 */
export function layoutDescoberta(c: ConteudoConhecimento, medir: Medir): LayoutDescoberta {
  const { w, h, margem } = CARD_DESCOBERTA;
  const largura = w - margem * 2;
  const cor = CATEGORIAS.find((k) => k.id === c.categoria)?.cor ?? "#ba9e50";
  const meio = w / 2;
  const limite = h - 230; // rodapé (frase da marca + @) fica abaixo disso
  const SEM_LIMITE = 99;

  // Tenta do maior para o menor: logo, pergunta e corpo encolhem juntos até caber.
  for (let passo = 0; passo <= 12; passo++) {
    const k = 1 - passo * 0.045; // até ~46% menor
    const logoW = Math.round(LOGO_STORY.w * Math.max(0.6, k));
    const logoH = Math.round((LOGO_STORY.h / LOGO_STORY.w) * logoW);
    const logo = { x: meio - logoW / 2, y: Math.round(LOGO_STORY.y * Math.max(0.55, k)), w: logoW, h: logoH };
    const barra = { x: meio - 60, y: logo.y + logo.h + Math.round(60 * k), w: 120, h: 8 };
    const linhas: LinhaCard[] = [];
    let y = barra.y + Math.round(100 * k);
    linhas.push({ texto: KICKER_DESCOBERTA, x: meio, y, tamanho: 40, peso: 700, cor });
    y += Math.round(90 * k);
    const tp = Math.round(66 * k);
    for (const l of quebrar(`“${c.pergunta}”`, largura, medir, tp, 800, SEM_LIMITE)) {
      linhas.push({ texto: l, x: meio, y, tamanho: tp, peso: 800, cor: "#f5f5f5" });
      y += Math.round(tp * 1.22);
    }
    y += Math.round(30 * k);
    let ts = 56;
    while (ts > 34 && medir(c.veredito, ts, 800) + 112 > largura) ts -= 2;
    const seloW = Math.min(largura, medir(c.veredito, ts, 800) + 112);
    const fundo = corDoVeredito(c.veredito);
    const selo = { x: meio - seloW / 2, y, w: seloW, h: 104, texto: c.veredito, fundo, corTexto: fundo === "#ba9e50" ? "#0a0a0a" : "#ffffff", tamanho: ts };
    y += selo.h + Math.round(80 * k);
    const tc = Math.round(42 * k);
    const corpo = (titulo: string, texto: string) => {
      linhas.push({ texto: titulo, x: meio, y, tamanho: Math.round(30 * Math.max(0.8, k)), peso: 800, cor });
      y += Math.round(tc * 1.35);
      for (const l of quebrar(texto, largura, medir, tc, 400, SEM_LIMITE)) {
        linhas.push({ texto: l, x: meio, y, tamanho: tc, peso: 400, cor: "#e6e6e6" });
        y += Math.round(tc * 1.38);
      }
      y += Math.round(tc * 0.9);
    };
    corpo("A RESPOSTA", c.rapida);
    if (c.pratica?.trim()) corpo("NA PRÁTICA", c.pratica);
    if (y - Math.round(tc * 0.9) <= limite || passo === 12) {
      const rodape = Math.min(h - 150, Math.max(limite + 60, y + 40));
      linhas.push({ texto: "Descobri no app do Montinho.", x: meio, y: rodape, tamanho: 38, peso: 600, cor });
      linhas.push({ texto: "@montinho_personal", x: meio, y: rodape + 56, tamanho: 34, peso: 700, cor: "#ba9e50" });
      return { linhas, cor, selo, logo, barra };
    }
  }
  throw new Error("layout impossível");
}
