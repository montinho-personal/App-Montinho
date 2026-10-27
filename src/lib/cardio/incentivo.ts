// ============================================================================
// Montinho Cardio — incentivo para o cardio curto (fim da musculação e
// cronômetro). Regras PURAS e textos curtos. Sem culpa, sem “queimar
// calorias”, sem empurrar além do combinado: o convite é para um cardio
// leve/moderado de 10–20 min, e nunca aparece com dor.
// ============================================================================

/** Durações rápidas oferecidas (min). 15 é o destaque. */
export const MINUTOS_RAPIDOS = [10, 15, 20] as const;

/** Convite no fim da musculação (um por treino, escolhido pelo id da sessão: não muda ao recarregar). */
export const CONVITES_POS_TREINO = [
  "Você já está aquecido: é o melhor momento para 15 minutinhos de cardio.",
  "O mais difícil, que era vir, você já fez. Bora fechar com 15 minutos?",
  "15 minutos é menos que um episódio de série. Seu coração agradece.",
  "Fecha o treino com chave de ouro: 15 minutos de cardio leve.",
  "Corpo quente, cabeça leve. Mais 15 minutos e o dia está pago.",
] as const;

/** Frases durante o cronômetro, pela fração do tempo. */
export const FRASES_CRONOMETRO: Array<{ ate: number; frases: readonly string[] }> = [
  { ate: 0.2, frases: ["Começa leve. O ritmo vem sozinho.", "Respira fundo e solta os ombros."] },
  { ate: 0.5, frases: ["Já passou do começo. Segue firme no seu ritmo.", "Ritmo de conversa: é aí que o fôlego cresce."] },
  { ate: 0.8, frases: ["Mais da metade! Agora é só manter.", "Cada minuto aqui é constância no bolso."] },
  { ate: 1, frases: ["Reta final. Você já ganhou o dia.", "Últimos minutos: termina do jeito que começou, no controle."] },
];
export const FRASE_FIM = "Cardio pago! Chalalá! ❤️‍🔥";

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function conviteDoTreino(sessaoId: string): string {
  return CONVITES_POS_TREINO[hash(sessaoId) % CONVITES_POS_TREINO.length];
}

/** Frase do momento do cronômetro (troca a cada minuto). */
export function fraseDoCronometro(segundos: number, alvoSeg: number): string {
  if (alvoSeg > 0 && segundos >= alvoSeg) return FRASE_FIM;
  const f = alvoSeg > 0 ? segundos / alvoSeg : 0;
  const faixa = FRASES_CRONOMETRO.find((x) => f < x.ate) ?? FRASES_CRONOMETRO.at(-1)!;
  return faixa.frases[Math.floor(segundos / 60) % faixa.frases.length];
}

/** Mostrar o convite no fim da musculação? Nunca com dor/desconforto nem em treino não concluído. */
export function mostrarConvite(e: { concluida: boolean; dor: boolean; jaFezCardioHoje: boolean }): boolean {
  return e.concluida && !e.dor && !e.jaFezCardioHoje;
}

/** Minutos para registrar ao parar o cronômetro (arredonda; mínimo 1). */
export function minutosDoCronometro(segundos: number): number {
  return Math.max(1, Math.round(segundos / 60));
}
