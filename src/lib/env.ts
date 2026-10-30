// ============================================================================
// Modo de execução da aplicação.
//
//  • "live"            → Supabase configurado: autenticação e RLS reais.
//  • "demo"            → SEM Supabase e com NEXT_PUBLIC_DEMO_MODE=true: dados
//                        fictícios em memória, identidade escolhida na tela de
//                        entrada e banner permanente "modo demonstração".
//  • "nao_configurado" → nada configurado: páginas privadas NÃO abrem.
//
// A ausência de variáveis nunca libera páginas privadas em produção (Prompt
// Mestre §3.1). Em deploy de produção na Vercel o modo demo só liga com
// DEMO_ALLOW_PRODUCTION=true, para evitar publicar dados fictícios por engano.
// ============================================================================

export type AppMode = "live" | "demo" | "nao_configurado";

export function supabaseConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function appMode(): AppMode {
  if (supabaseConfigurado()) return "live";
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!demo) return "nao_configurado";
  const producao = process.env.VERCEL_ENV === "production";
  if (producao && process.env.DEMO_ALLOW_PRODUCTION !== "true") return "nao_configurado";
  return "demo";
}

export const isDemoMode = (): boolean => appMode() === "demo";
export const isLiveMode = (): boolean => appMode() === "live";

/** Recursos experimentais atrás de flag (desligados por padrão). */
export const FEATURES = {
  /** Camada opcional de IA para busca em linguagem natural na memória de prescrições. */
  iaMemoria: process.env.AI_PROVIDER === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY),
  /** Estimativa de estímulo secundário ligada por padrão na Tabela de Volume. */
  secundarioPadrao: process.env.NEXT_PUBLIC_VOLUME_SECUNDARIO_PADRAO === "true",
  /** Modo Visitante (cadastro por convite, acesso com prazo). Sem a flag, as rotas respondem 404. */
  modoVisitante: process.env.NEXT_PUBLIC_MODO_VISITANTE === "true",
  /** Montinho Multimodalidade (0133: Cross Training, HYROX, funcional, híbrido). Desligado = o app igual a antes. */
  multimodalidade: process.env.NEXT_PUBLIC_MULTIMODALIDADE === "true",
} as const;

/** Nome do cookie que guarda a identidade escolhida no modo demo. */
export const DEMO_COOKIE = "montinho_demo";
