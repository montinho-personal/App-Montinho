// ============================================================================
// Reorganizar a ordem dos treinos no montador (pedido do Montinho, 04/11/2026:
// “reorganizar a ordem dos treinos A, B, C, D”). Regra PURA: ↑/↓ troca a letra
// com o vizinho. Cada treino continua o mesmo (mesmo id e histórico), só muda a
// posição/letra. O calendário (dia → letra) e a frequência continuam pela letra:
// o treino que vira “A” passa a cair no dia do A.
// ============================================================================
import { LETRAS_TREINO, type TreinoLetra } from "@/lib/supabase/types-sessoes";

const pos = (l: TreinoLetra) => LETRAS_TREINO.indexOf(l);

export function ordenarPorLetra<T extends { letra: TreinoLetra }>(treinos: T[]): T[] {
  return [...treinos].sort((a, b) => pos(a.letra) - pos(b.letra));
}

/** Troca o treino `key` com o de cima (-1) ou de baixo (+1). Sem vizinho, devolve igual. */
export function moverTreino<T extends { key: string; letra: TreinoLetra }>(treinos: T[], key: string, dir: -1 | 1): T[] {
  const lista = ordenarPorLetra(treinos);
  const i = lista.findIndex((t) => t.key === key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= lista.length) return treinos;
  const a = lista[i];
  const b = lista[j];
  lista[i] = { ...b, letra: a.letra };
  lista[j] = { ...a, letra: b.letra };
  return lista;
}
