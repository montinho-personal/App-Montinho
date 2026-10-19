/**
 * ============================================================
 *  IDENTIDADE VISUAL DO APP — EDITE AQUI (e basicamente só aqui)
 * ============================================================
 * Este é o lugar central para deixar o app com a SUA cara:
 * nome, cores, logo e contatos.
 *
 * Depois de editar, rode `npm run dev` e veja a mudança na hora.
 *
 * Não sabe mexer no código? Abra o Claude Code nesta pasta e peça,
 * por exemplo:
 *   "troque a cor de destaque para verde #16a34a e o nome para FELIPE TEAM"
 *   "use minha logo que salvei em public/brand/logo.svg"
 * O Claude edita este arquivo por você. Veja MANUAL-CLAUDE.md.
 * ============================================================
 */

export const BRAND = {
  /** Nome curto — aparece no topo, no menu e no título da aba do navegador. */
  name: "Squad",

  /** Nome completo — tela de login, rodapés e metadados do site. */
  fullName: "Squad App",

  /** Frase curta de apoio (tela de login e abertura). */
  tagline: "Treino, dieta e evolução no mesmo lugar.",

  /**
   * LOGO
   * Coloque seus arquivos em /public/brand/ e aponte os caminhos abaixo.
   * Prefere não usar imagem? Deixe `useText: true` que o app desenha o
   * seu `name` como logotipo automaticamente — funciona muito bem.
   */
  logo: {
    useText: true, // true = usa o texto `name` como logo. false = usa os SVGs abaixo.
    full: "/brand/logo.svg", // logo horizontal (usada quando useText = false)
    mark: "/brand/mark.svg", // símbolo/ícone quadrado (favicon, avatar)
  },

  /**
   * CORES — troque os HEX pela sua identidade.
   * `accent` é a cor principal (botões, destaques, gráficos).
   * O resto define o tema escuro; mude só se quiser.
   * Essas cores são injetadas como variáveis CSS em runtime,
   * então editar aqui re-tematiza o app inteiro sem mais nada.
   */
  colors: {
    accent: "#7c3aed", // cor principal (botões, links, destaques)
    accentHover: "#8b5cf6", // estado hover
    accentPress: "#6d28d9", // estado pressionado

    bg: "#0a0a0a", // fundo geral
    surface: "#131313", // fundo de seções
    card: "#1a1a1a", // cartões

    fg: "#fafafa", // texto principal
    fgMuted: "#a1a1a1", // texto secundário
  },

  /**
   * CONTATOS — aparecem em telas de perfil/ajuda.
   * Deixe "" (vazio) para ocultar o item.
   */
  contact: {
    whatsapp: "", // só números, ex: "5511999999999"
    email: "", // ex: "contato@seudominio.com.br"
    instagram: "", // sem @, ex: "seu_perfil"
  },

  /** URL pública do app em produção (preenchida pela Vercel). */
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export type Brand = typeof BRAND;

/**
 * String de variáveis CSS gerada a partir das cores acima.
 * É injetada em <style> pelo layout raiz (src/app/layout.tsx),
 * sobrescrevendo os valores padrão definidos em globals.css.
 * Você normalmente NÃO precisa mexer aqui.
 */
export function brandCssVars(): string {
  const c = BRAND.colors;
  return `:root{` +
    `--color-accent:${c.accent};` +
    `--color-accent-hover:${c.accentHover};` +
    `--color-accent-press:${c.accentPress};` +
    `--color-bg:${c.bg};` +
    `--color-surface:${c.surface};` +
    `--color-card:${c.card};` +
    `--color-fg:${c.fg};` +
    `--color-fg-muted:${c.fgMuted};` +
    `}`;
}
