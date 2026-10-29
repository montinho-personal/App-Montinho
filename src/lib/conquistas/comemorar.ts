// ============================================================================
// Quais troféus comemorar agora (pedido do Montinho, 29/10/2026: “cada
// conquista percebida e celebrada”). Regra única para o fim da musculação,
// o registro de cardio, o compartilhamento e o Início:
//  • só o que ainda NÃO foi visto (vista_em vazio) — nunca repete;
//  • só o que foi gravado a partir de um instante (o começo do treino, o
//    pedido do cardio…), mesmo sem ligação com a sessão (cardio, semana,
//    compartilhar) e mesmo se outra tela gravou primeiro;
//  • nada de relatório mensal (tem o seu próprio momento).
// ============================================================================

type Linha = { id: string; codigo: string; created_at: string; vista_em?: string | null };

export function paraComemorar<T extends Linha>(todas: T[], desde: string, filtro: (codigo: string) => boolean = () => true): T[] {
  const t0 = Date.parse(desde);
  const vistos = new Set<string>();
  return todas
    .filter((c) => !c.vista_em && c.codigo !== "relatorio_mensal" && Date.parse(c.created_at) >= t0 && filtro(c.codigo))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .filter((c) => (vistos.has(c.id) ? false : (vistos.add(c.id), true)));
}

/** Junta listas sem repetir a mesma conquista (por id), na ordem em que chegaram. */
export function juntarSemRepetir<T extends { id: string }>(...listas: T[][]): T[] {
  const ja = new Set<string>();
  const out: T[] = [];
  for (const l of listas) for (const c of l) if (!ja.has(c.id)) { ja.add(c.id); out.push(c); }
  return out;
}
