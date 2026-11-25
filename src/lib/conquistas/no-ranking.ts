// Deixar claro, na comemoração, se o troféu SOMA no ranking (pedido do Montinho, 25/11/2026:
// “o card do Novo recorde pessoal dá a impressão de que está contando”).
// Regra do ranking (0152/0158–0163): cada código conta 1 vez; feriados, Fôlego Extra/Dobro/Triplo,
// Espalhando o Chalalá e as metas do cardio contam cada vez; a Multimodalidade fica de fora.
import { CATALOGO, type CodigoConquista } from "@/lib/conquistas/regras";
import { FORA_DO_RANKING, chaveNoRanking, contaCadaVez } from "@/lib/ranking/trofeus";

/** conta = +1 no ranking agora · ja_contou = o mesmo troféu já tinha contado antes · fora = não entra no ranking. */
export type RankingDoTrofeu = "conta" | "ja_contou" | "fora";

type Trofeu = { codigo: string; referencia?: string | null };

/** Na hora de gravar: compara com os troféus que a pessoa já tinha (mesma chave do ranking). */
export function rankingAoGanhar(nova: Trofeu, jaGanhos: Trofeu[]): RankingDoTrofeu {
  if ((FORA_DO_RANKING as readonly string[]).includes(nova.codigo)) return "fora";
  const chave = chaveNoRanking(nova);
  return jaGanhos.some((c) => !(FORA_DO_RANKING as readonly string[]).includes(c.codigo) && chaveNoRanking(c) === chave) ? "ja_contou" : "conta";
}

/** Marca uma lista de troféus novos (em ordem de data), cada um olhando os de antes e os anteriores da própria lista. */
export function marcarRankingDosNovos<T extends Trofeu & { conquistado_em: string }>(novos: T[], existentes: Trofeu[]): Map<T, RankingDoTrofeu> {
  const vistos: Trofeu[] = [...existentes];
  const out = new Map<T, RankingDoTrofeu>();
  for (const n of [...novos].sort((a, b) => a.conquistado_em.localeCompare(b.conquistado_em))) {
    out.set(n, rankingAoGanhar(n, vistos));
    vistos.push(n);
  }
  return out;
}

/** Troféu que se repete mas só conta 1 vez no ranking (recorde, Eu voltei, Voltei a Respirar…). */
export function repeteSemContar(codigo: string): boolean {
  return Boolean(CATALOGO[codigo as CodigoConquista]?.repete) && !contaCadaVez(codigo);
}

/** Estado para mostrar: o gravado na hora (dados.ranking) ou, nos troféus antigos sem marca, o que dá para saber pelo código. */
export function rankingParaMostrar(c: { codigo: string; dados?: unknown }): RankingDoTrofeu | "uma_vez" {
  const gravado = (c.dados as { ranking?: unknown } | null | undefined)?.ranking;
  if (gravado === "conta" || gravado === "ja_contou" || gravado === "fora") return gravado;
  if ((FORA_DO_RANKING as readonly string[]).includes(c.codigo)) return "fora";
  return repeteSemContar(c.codigo) ? "uma_vez" : "conta";
}

/** Frase curta para a comemoração. */
export function textoRanking(c: { codigo: string; titulo?: string | null; dados?: unknown }): { conta: boolean; titulo: string; detalhe: string | null } {
  const estado = rankingParaMostrar(c);
  const nome = c.titulo?.trim() || CATALOGO[c.codigo as CodigoConquista]?.titulo || "Este troféu";
  const recorde = c.codigo === "recorde";
  if (estado === "conta") return { conta: true, titulo: "🏆 +1 troféu no ranking", detalhe: null };
  if (estado === "fora") return { conta: false, titulo: "Este troféu não conta no ranking", detalhe: "Os troféus da Multimodalidade ficam fora do ranking." };
  if (recorde) {
    return {
      conta: false,
      titulo: estado === "ja_contou" ? "Este recorde não soma no ranking" : "O “Novo recorde pessoal” conta 1 vez só no ranking",
      detalhe: estado === "ja_contou" ? "O “Novo recorde pessoal” conta 1 vez só, e o seu primeiro já contou. Cada recorde novo soma no Caçador de Recordes, e esse vale troféu no ranking." : "O primeiro recorde soma 1 troféu. Os próximos somam no Caçador de Recordes, que vale troféu no ranking.",
    };
  }
  return {
    conta: false,
    titulo: estado === "ja_contou" ? "Este não soma de novo no ranking" : `“${nome}” conta 1 vez só no ranking`,
    detalhe: estado === "ja_contou" ? `“${nome}” conta 1 vez só no ranking, e a primeira já contou.` : null,
  };
}
