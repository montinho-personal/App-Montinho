// ============================================================================
// Indicação com desconto (0102, pedido do Montinho em 28/10/2026) — PURO.
// Cada amigo indicado que FECHA um plano vale 10% de desconto para quem
// indicou (visitante ou aluno). Os descontos somam até 30% num mesmo plano e
// não têm prazo. Ao usar, o personal marca “usado” e saem os mais antigos;
// o que passou de 30% fica guardado para a próxima vez.
// ============================================================================

export const REGRAS_DESCONTO = { porAmigo: 10, maximo: 30 } as const;

export type LinhaIndicacao = { id: string; created_at: string; fechou_em: string | null; desconto_pct: number | null; desconto_usado_em: string | null };

export type ResumoDesconto = {
  /** Amigos que criaram a conta pelo link. */
  cadastrados: number;
  /** Amigos que fecharam um plano. */
  fecharam: number;
  /** Desconto que dá para usar agora (até 30%). */
  pct: number;
  /** Indicações que entram no desconto de agora (as mais antigas). */
  aUsar: string[];
  /** Desconto que passou de 30% e fica para a próxima vez. */
  guardado: number;
  /** Já usado em planos anteriores. */
  usado: number;
};

export function resumoDesconto(linhas: LinhaIndicacao[]): ResumoDesconto {
  const fechadas = linhas.filter((l) => l.fechou_em);
  const livres = fechadas.filter((l) => !l.desconto_usado_em && (l.desconto_pct ?? 0) > 0).sort((a, b) => (a.fechou_em! < b.fechou_em! ? -1 : 1));
  const aUsar: string[] = [];
  let pct = 0;
  for (const l of livres) {
    const v = l.desconto_pct ?? 0;
    if (pct + v > REGRAS_DESCONTO.maximo) break;
    pct += v;
    aUsar.push(l.id);
  }
  const totalLivre = livres.reduce((n, l) => n + (l.desconto_pct ?? 0), 0);
  return {
    cadastrados: linhas.length,
    fecharam: fechadas.length,
    pct,
    aUsar,
    guardado: totalLivre - pct,
    usado: fechadas.filter((l) => l.desconto_usado_em).reduce((n, l) => n + (l.desconto_pct ?? 0), 0),
  };
}

/** Mensagem pronta para o WhatsApp do Montinho na hora de usar o desconto. */
export function mensagemUsarDesconto(pct: number, nome?: string | null): string {
  const quem = nome?.trim() ? `Aqui é ${nome.trim().split(/\s+/)[0]}. ` : "";
  return `Oi, Montinho! ${quem}Ganhei ${pct}% de desconto por indicação no app e quero usar no meu plano. 🎁`;
}

/** Escada mostrada nos incentivos: 1 amigo que fecha = 10%, 2 = 20%, 3 = 30%. */
export const ESCADA_DESCONTO = [1, 2, 3].map((amigos) => ({ amigos, pct: amigos * REGRAS_DESCONTO.porAmigo }));

/** Onde o desconto vale: visitante fecha o 1º plano; aluno usa na próxima renovação. */
export const ondeVale = (aluno: boolean) => (aluno ? "na sua próxima renovação" : "em qualquer plano");

/** Momentos do app em que o convite aparece (texto conforme o momento). */
export type MomentoIndicacao = "fim_treino" | "conquistas" | "ranking" | "inicio" | "cardio";

export function textoDoMomento(m: MomentoIndicacao, aluno: boolean): { titulo: string; texto: string } {
  const vale = ondeVale(aluno);
  switch (m) {
    case "fim_treino":
      return { titulo: "Treino pago! Bora trazer alguém junto?", texto: `Amigo que treina junto não falta. E se ele fechar com o Montinho, você ganha desconto ${vale}.` };
    case "conquistas":
      return { titulo: "Conquista boa é conquista dividida", texto: `Chame um amigo para essa jornada. Cada amigo que fechar te dá 10% de desconto ${vale}.` };
    case "ranking":
      return { titulo: "Suba no ranking com um parceiro de treino", texto: `Indique quem você quer ver aqui. Se ele fechar, o desconto ${vale} é seu.` };
    case "cardio":
      return { titulo: "Cardio rende mais com companhia", texto: `Chame alguém para treinar junto: amigo que fecha vale desconto ${vale}.` };
    default:
      return { titulo: "Indique amigos e ganhe até 30%", texto: `Cada amigo que fechar com o Montinho te dá 10% de desconto ${vale}.` };
  }
}
