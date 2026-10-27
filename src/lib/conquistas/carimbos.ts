// ============================================================================
// Carimbos (pedido do Montinho, 27/10/2026): cada treino de musculação
// concluído vale 1 carimbo, para sempre (o cartão nunca zera). Cartões de 10.
// Entram no desempate do ranking logo depois da aderência da última semana.
// Conta: treino concluído (metade das séries ou mais) e treino extra/livre
// com séries. Não contam: parcial, cancelado, extra só de atividade (cardio,
// mobilidade) e histórico importado de outro app.
// ============================================================================
import { classificarSessao, type SessaoAderencia } from "@/lib/aderencia/calcular";

export const CARIMBOS_POR_CARTAO = 10;

type SessaoCarimbo = SessaoAderencia & { conta_aderencia?: boolean | null };

export function contaCarimbo(s: SessaoCarimbo): boolean {
  if (s.origem === "importado" || s.conta_aderencia === false) return false;
  const c = classificarSessao(s);
  return c === "concluida" || (c === "extra" && (s.series_concluidas ?? 0) > 0);
}

export function contarCarimbos(sessoes: SessaoCarimbo[]): number {
  return sessoes.filter(contaCarimbo).length;
}

/** Cartão atual: carimbos nele (0–9), cartões cheios e quanto falta para fechar o cartão. */
export function cartaoDeCarimbos(total: number): { noCartao: number; cartoesCheios: number; faltam: number } {
  const noCartao = total % CARIMBOS_POR_CARTAO;
  return { noCartao, cartoesCheios: Math.floor(total / CARIMBOS_POR_CARTAO), faltam: CARIMBOS_POR_CARTAO - noCartao };
}
