// ============================================================================
// Aviso do feriado no celular (0121) — textos (PURO, testado).
// QUANDO enviar fica no banco (feriado_notificacoes_devidas): no dia, 8h–11h59,
// 1 por pessoa por feriado. Sempre cita os troféus com o nome do feriado que
// ainda estão em jogo (musculação, cardio e o +1 dos dois). Sem culpa.
// ============================================================================
import type { MensagemPush } from "./mensagem";
import { tituloFeriado } from "@/lib/conquistas/feriados";

export type DadosFeriado = { nome?: string | null; feriado?: string | null; slug?: string | null; emoji?: string | null; ganhos?: string[] | null };

export const TTL_FERIADO_SEG = 4 * 60 * 60;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Troféus do feriado que ainda dá para ganhar hoje. */
export function trofeusEmJogoFeriado(d: DadosFeriado): string[] {
  const f = d.feriado?.trim() || "Feriado";
  const tem = new Set(d.ganhos ?? []);
  return (["feriado_musculacao", "feriado_cardio", "feriado_combo"] as const).filter((c) => !tem.has(c)).map((c) => tituloFeriado(c, f));
}

export function mensagemFeriado(id: string, d: DadosFeriado): MensagemPush & { id: string } {
  const f = d.feriado?.trim() || "Feriado";
  const emoji = d.emoji?.trim() || "🎉";
  const nome = d.nome?.trim() ? `${d.nome.trim()}, ` : "";
  const falta = trofeusEmJogoFeriado(d);
  const lista = falta.length === 3 ? `“${falta[0]}” (musculação), “${falta[1]}” (cardio) e “${falta[2]}” se fizer os dois` : falta.map((t) => `“${t}”`).join(" e ");
  const opcoes = falta.length
    ? [
        { titulo: `${emoji} ${f}: dia de troféu!`, corpo: `${nome}hoje treinar vale troféu com o nome do feriado: ${lista} 🏆` },
        { titulo: `${emoji} Feriado? Treino pago!`, corpo: `${nome}enquanto muita gente para, você soma. Hoje vale ${lista} 🏆` },
      ]
    : [{ titulo: `${emoji} ${f} completo!`, corpo: `${nome}você já levou os 3 troféus do feriado. Aproveite o descanso! 💛` }];
  const { titulo, corpo: texto } = opcoes[hash(id) % opcoes.length];
  const corpo = texto.charAt(0).toUpperCase() + texto.slice(1);
  return { id, titulo, corpo, url: "/aluno#feriado", tag: "feriado" };
}
