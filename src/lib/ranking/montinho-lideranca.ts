// Situação do Montinho no ranking AGORA (pedido do Montinho, 04/11/2026: “quando
// eu passar a Natália, o Clube continua mostrando quem já passou; ter uma mensagem
// que desperte curiosidade quando eu estiver em 1º”). O Clube continua sendo o
// HISTÓRICO de quem ganhou “Passei o Montinho” (o troféu fica); isto só diz quem
// está na frente dele hoje, para o cartão mudar o tom. Regra pura.
export type Lideranca = {
  /** O Montinho estaria em 1º (ninguém na frente dele). */
  lider: boolean;
  /** Quem está na frente dele agora, na ordem do ranking. */
  naFrente: Array<{ ref: string | null; nome: string; eu: boolean }>;
};

/**
 * `posicao` = onde o Montinho estaria (0117, mesma ordem de desempate do ranking);
 * `linhas` = o ranking oficial já na ordem (sem a ficha do personal). Quem está
 * antes da posição dele está na frente. Sem posição (ainda sem troféus) = null.
 */
export function liderancaDoMontinho(posicao: number | null | undefined, linhas: Array<{ ref?: string | null; nome: string; eu: boolean }>): Lideranca | null {
  if (!posicao || posicao < 1) return null;
  const naFrente = linhas.slice(0, posicao - 1).map((l) => ({ ref: l.ref ?? null, nome: l.nome, eu: l.eu }));
  return { lider: naFrente.length === 0, naFrente };
}

/** Título e frase do cartão “Clube de quem passou o Montinho”. */
export function textoDoClube(n: number, l: Lideranca | null, personal: boolean): { titulo: string; frase: string | null; destaque: boolean } {
  const ja = n === 1 ? "1 pessoa já passou" : `${n} pessoas já passaram`;
  if (l && l.naFrente.length > 0) {
    const eu = l.naFrente.some((p) => p.eu);
    const primeiro = l.naFrente[0].nome.split(" ")[0];
    const quem = eu ? "Você está" : l.naFrente.length === 1 ? `${primeiro} está` : `${l.naFrente.length} pessoas estão`;
    return {
      titulo: personal ? `🔥 ${l.naFrente.length === 1 ? `${primeiro} está` : `${l.naFrente.length} pessoas estão`} na sua frente agora!` : `🔥 ${quem} na frente do Montinho agora!`,
      frase: personal ? "Dá para recuperar o 1º lugar? 👀" : eu ? "Segure a posição: ele vai tentar recuperar! 👀" : "Ele vai conseguir recuperar? 👀",
      destaque: true,
    };
  }
  if (l?.lider && n > 0) {
    return {
      titulo: personal ? "👑 Você retomou a liderança!" : "👑 O Montinho retomou a liderança!",
      frase: personal ? `${ja} você, mas você voltou para a frente. Quem vai ser a próxima? 👀` : `${ja} o Montinho, mas ele voltou para a frente. Quem vai ser a próxima? 👀`,
      destaque: true,
    };
  }
  if (n === 0) return { titulo: "Ninguém passou o Montinho ainda", frase: null, destaque: false };
  return { titulo: `${ja} o Montinho`, frase: null, destaque: false };
}
