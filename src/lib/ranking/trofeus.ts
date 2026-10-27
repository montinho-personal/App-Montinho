// Ranking de troféus (0076/0079): quem tem mais troféus diferentes; empate em
// troféus é decidido pela constância (DESEMPATE). 1º, 2º e 3º lugares = ouro,
// prata e bronze. Contas puras.
import type { ResultadoAderencia } from "@/lib/aderencia/calcular";

export type LinhaRanking = {
  posicao: number;
  nome: string;
  trofeus: number;
  eu: boolean;
  visitante: boolean;
  /** Aderência da última semana fechada (só o personal e a própria pessoa recebem). */
  aderenciaSemana?: number | null;
  /** Mesmo número de troféus de quem está logo acima (ficou atrás no desempate). */
  mesmoTotalAcima?: boolean;
};

/** Critérios de desempate, na ordem (texto do asterisco embaixo do ranking). */
export const DESEMPATE =
  "* Empatou em troféus? Fica na frente quem cumpriu melhor a meta de treinos da semana passada. Se continuar empatado, ganha quem tem mais carimbos (treinos concluídos desde o começo); depois, quem está há mais semanas seguidas cumprindo a meta; depois, quem cumpriu melhor a meta nas últimas 4 semanas; e, por último, quem chegou primeiro a esse número de troféus.";

export type Desempate = { pctSemana: number | null; semanaInicio: string | null; semanasSeguidas: number; pct4Semanas: number | null };

/** Números de desempate a partir da aderência (mesma conta da tela Evolução). */
export function desempateDaAderencia(r: Pick<ResultadoAderencia, "semanas" | "sequencia" | "indices">): Desempate {
  const fechada = r.semanas.filter((s) => !s.atual && !s.pausada && s.meta).at(-1) ?? null;
  const pct = (v: number | null) => (v == null ? null : Math.max(0, Math.min(100, Math.round(v))));
  return {
    pctSemana: fechada && fechada.meta ? pct((fechada.pontos / fechada.meta) * 100) : null,
    semanaInicio: fechada?.inicio ?? null,
    semanasSeguidas: Math.max(0, r.sequencia.atual),
    pct4Semanas: pct(r.indices.d28.pct),
  };
}
export type Podio = "ouro" | "prata" | "bronze";

export const PODIO: Record<Podio, { emoji: string; rotulo: string; cor: string }> = {
  ouro: { emoji: "🥇", rotulo: "Ouro", cor: "#f5c451" },
  prata: { emoji: "🥈", rotulo: "Prata", cor: "#d4d4d8" },
  bronze: { emoji: "🥉", rotulo: "Bronze", cor: "#d08a4f" },
};

export function podioDaPosicao(posicao: number): Podio | null {
  return posicao === 1 ? "ouro" : posicao === 2 ? "prata" : posicao === 3 ? "bronze" : null;
}

/** O que falta para subir: a posição de cima e quantos troféus para alcançá-la (empatar já divide o lugar). */
export function proximoDegrau(linhas: LinhaRanking[]): { posicao: number; faltam: number } | null {
  const eu = linhas.find((l) => l.eu);
  if (!eu || eu.posicao === 1) return null;
  const acima = linhas.filter((l) => l.posicao < eu.posicao).at(-1);
  if (!acima) return null;
  return { posicao: acima.posicao, faltam: Math.max(0, acima.trofeus - eu.trofeus) };
}

export function fraseDoRanking(linhas: LinhaRanking[]): string {
  const eu = linhas.find((l) => l.eu);
  if (!eu) return "Conquiste o seu primeiro troféu para entrar no ranking.";
  const p = podioDaPosicao(eu.posicao);
  const prox = proximoDegrau(linhas);
  if (eu.posicao === 1) return "Você está no topo! Cada troféu novo ajuda a manter o ouro.";
  const onde = p ? `Você está no ${eu.posicao}º lugar: ${PODIO[p].rotulo.toLowerCase()}!` : `Você está em ${eu.posicao}º lugar.`;
  if (prox && prox.faltam === 0) return `${onde} Você tem os mesmos troféus de quem está no ${prox.posicao}º lugar: cumpra a sua meta desta semana para passar na frente no desempate.`;
  return prox ? `${onde} ${prox.faltam === 1 ? "Falta" : "Faltam"} ${prox.faltam} ${prox.faltam === 1 ? "troféu" : "troféus"} para chegar ao ${prox.posicao}º lugar.` : onde;
}

/** Conquistas que se repetem e ficam em seções próprias: não contam como troféu no ranking (igual à sala de troféus). Espelho de 0077. */
/** cardio_500/1000 ainda desligados (ao ligar: pôr na vitrine e tirar daqui e do SQL). */
export const FORA_DO_RANKING = ["recorde", "eu_voltei", "desafio_concluido", "cardio_voltei", "cardio_500", "cardio_1000"] as const;
