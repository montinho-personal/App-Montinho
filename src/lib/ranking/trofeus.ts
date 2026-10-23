// Ranking de troféus (0076): quem tem mais troféus diferentes. Empate divide a
// posição. 1º, 2º e 3º lugares = ouro, prata e bronze. Contas puras.

export type LinhaRanking = { posicao: number; nome: string; trofeus: number; eu: boolean; visitante: boolean };
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
  const acima = linhas.filter((l) => l.posicao === eu.posicao - 1)[0];
  if (!acima) return null;
  return { posicao: acima.posicao, faltam: Math.max(1, acima.trofeus - eu.trofeus) };
}

export function fraseDoRanking(linhas: LinhaRanking[]): string {
  const eu = linhas.find((l) => l.eu);
  if (!eu) return "Conquiste o seu primeiro troféu para entrar no ranking.";
  const p = podioDaPosicao(eu.posicao);
  const prox = proximoDegrau(linhas);
  if (eu.posicao === 1) return "Você está no topo! Cada troféu novo ajuda a manter o ouro.";
  const onde = p ? `Você está no ${eu.posicao}º lugar: ${PODIO[p].rotulo.toLowerCase()}!` : `Você está em ${eu.posicao}º lugar.`;
  return prox ? `${onde} Faltam ${prox.faltam} ${prox.faltam === 1 ? "troféu" : "troféus"} para chegar ao ${prox.posicao}º lugar.` : onde;
}
