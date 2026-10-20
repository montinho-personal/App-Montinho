/**
 * ============================================================
 *  IDENTIDADE VISUAL — MONTINHO PERSONAL TRAINER
 * ============================================================
 * Fonte única da marca no app. As cores viram variáveis CSS em runtime
 * (src/app/layout.tsx) e re-tematizam tudo.
 *
 * ORIGEM DOS ATIVOS (ver AUDITORIA-INICIAL.md e ROADMAP.md):
 *  • Logotipo: arquivo público do site oficial (montinhopersonal.com.br/logo.svg),
 *    com variante para fundo escuro (texto claro) e o símbolo (halter "M")
 *    recortado sem distorção. Substitua por um vetor original do designer
 *    quando disponível: basta trocar os arquivos em /public/brand/.
 *  • Cores: dourado #ba9e50 (destaque do site), fundo #0a0a0a e texto #fafafa.
 *  • Tipografia: DM Sans (a mesma do site), carregada via next/font.
 * ============================================================
 */

export const BRAND = {
  /** Nome curto — menu, saudações, título da aba. */
  name: "Montinho",

  /** Nome completo — login, rodapés, metadados. */
  fullName: "Montinho Personal Trainer",

  /** Frase central do posicionamento. */
  tagline: "Não é só sobre começar. É sobre conseguir continuar.",

  /** Descrição curta para metadados/SEO. */
  description: "Treino prescrito, registrado e acompanhado pelo Montinho. Volume semanal em tempo real para quem prescreve e clareza para quem treina.",

  /**
   * LOGO — arquivos em /public/brand/.
   * `useText: false` usa as imagens; `true` desenha o nome em texto (fallback).
   */
  logo: {
    useText: false,
    /** Variante para fundo escuro (texto claro). */
    full: "/brand/logo.svg",
    /** Variante original para fundo claro. */
    fullLight: "/brand/logo-fundo-claro.svg",
    /** Símbolo (halter "M") — avatar, menu recolhido, ícone. */
    mark: "/brand/mark.svg",
    /** Texto do logotipo (MONTINHO / PERSONAL TRAINER) recortado do logo oficial — para usar ao lado do símbolo. */
    wordmark: "/brand/wordmark.svg",
    /** Proporção largura/altura do logotipo completo (viewBox 469×321). */
    ratio: 469 / 321,
  },

  /** CORES — tokens principais (o restante do tema fica em globals.css). */
  colors: {
    accent: "#ba9e50", // dourado Montinho
    accentHover: "#cbb06a",
    accentPress: "#a58b45",
    accentSoft: "#2a2415", // fundo sutil para chips/realces

    bg: "#0a0a0a",
    surface: "#111111",
    card: "#171717",

    fg: "#fafafa",
    fgMuted: "#c2c2c2",
  },

  /** CONTATOS — vazios ficam ocultos. */
  contact: {
    whatsapp: "", // só números, ex: "5511999999999" (preencher com o número de atendimento)
    email: "",
    instagram: "montinho_personal",
    site: "https://www.montinhopersonal.com.br/",
  },

  /** URL pública do app em produção (preenchida pela Vercel). */
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export type Brand = typeof BRAND;

/** Variáveis CSS geradas a partir das cores (injetadas no layout raiz). */
export function brandCssVars(): string {
  const c = BRAND.colors;
  return (
    `:root{` +
    `--color-accent:${c.accent};` +
    `--color-accent-hover:${c.accentHover};` +
    `--color-accent-press:${c.accentPress};` +
    `--color-accent-soft:${c.accentSoft};` +
    `--color-bg:${c.bg};` +
    `--color-surface:${c.surface};` +
    `--color-card:${c.card};` +
    `--color-fg:${c.fg};` +
    `--color-fg-muted:${c.fgMuted};` +
    `}`
  );
}
