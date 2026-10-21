// ============================================================================
// Ecossistema Chalalá — textos das notificações no celular (PURO, testado).
// As regras de QUANDO enviar (dias úteis, horário, silêncio, limites, 48 h,
// expiração, duplicidade) vivem no banco (migração 0036) e têm testes lá.
// Aqui ficam só os textos e a montagem do que vai para o aparelho.
// Tom: fala espontânea do Montinho — humor, acolhimento, zero cobrança.
// ============================================================================

import type { MensagemPush } from "./mensagem";

export type CategoriaChalala = "bom_dia" | "pos_treino" | "teste";

/** As 5 mensagens do Bom Dia com Chalalá (alternadas, nunca a mesma 2 dias seguidos). */
export const BOM_DIA: ReadonlyArray<{ titulo: string; corpo: string }> = [
  { titulo: "Bom dia! Bora de Chalalá?", corpo: "Acorda! Lava esse rosto, toma seu cafezinho e agradece por mais um dia. Bora colocar um chalalá nessa vida!" },
  { titulo: "Um Chalalá pra começar o dia!", corpo: "Bom dia! Antes de pensar nos problemas, lembra de uma coisa boa que você tem na vida. Agora toma seu café e bora fazer esse dia valer um chalalá!" },
  { titulo: "Bom dia, meu povo!", corpo: "Levanta, lava esse rosto, toma aquele cafezinho e agradece por estar aqui. Hoje tem chalalá! É impossível dar errado!" },
  { titulo: "Hoje também merece um Chalalá!", corpo: "Bom dia! A vida nem sempre tá fácil, eu sei. Mas olha só: mais um dia pra fazer alguma coisa boa acontecer! Toma seu cafezinho, agradece pelo que tem e bora de chalalá!" },
  { titulo: "Bora colocar um Chalalá nessa vida?", corpo: "Bom dia! Acordou meio sem vontade? Normal, acontece! Mas ó, você ganhou mais um dia pra fazer valer a pena. Lava esse rosto, toma aquele cafezinho, agradece por alguma coisa boa e bora colocar um chalalá nessa vida! É impossível dar errado!" },
];

export const POS_TREINO = {
  titulo: "Seu corpo também merece um Chalalá!",
  corpo: "Treino feito! Agora capricha na alimentação, na proteína e no descanso. Dormir bem também faz parte do chalalá!",
} as const;

export const TESTE = {
  titulo: "Chalalá de teste!",
  corpo: "Se você está lendo isso no celular, as notificações do Montinho estão funcionando. É impossível dar errado!",
} as const;

/** Mesma regra do banco: depois da mensagem n vem a n+1 (5 → 1). */
export const proximaMensagemBomDia = (ultima: number | null | undefined): number => ((ultima ?? 0) % BOM_DIA.length) + 1;

/** Histórico do app: o texto completo fica lá (o celular pode cortar a prévia). */
export const URL_HISTORICO = "/aluno/notificacoes";

export type EnvioChalala = { envio_id: string; categoria: CategoriaChalala; mensagem: number | null };

/** O que vai para o aparelho (o `id` permite registrar a abertura, sem dado pessoal). */
export function mensagemChalala(e: EnvioChalala, opts: { treinador?: boolean } = {}): MensagemPush & { id: string } {
  const base = e.categoria === "bom_dia" ? BOM_DIA[((e.mensagem ?? 1) - 1 + BOM_DIA.length) % BOM_DIA.length] : e.categoria === "pos_treino" ? POS_TREINO : TESTE;
  const url = e.categoria === "teste" && opts.treinador ? "/treinador/conquistas" : `${URL_HISTORICO}?n=${e.envio_id}`;
  // Tag por categoria: um Bom Dia novo substitui o anterior na bandeja, sem empilhar.
  return { id: e.envio_id, titulo: base.titulo, corpo: base.corpo, url, tag: `chalala-${e.categoria}` };
}

/** Linhas do banco (uma por aparelho) → um envio com a lista de aparelhos. */
export function agruparPorEnvio<T extends EnvioChalala & { endpoint: string; p256dh: string; auth: string }>(linhas: T[]): Array<EnvioChalala & { aparelhos: Array<{ endpoint: string; p256dh: string; auth: string }> }> {
  const m = new Map<string, EnvioChalala & { aparelhos: Array<{ endpoint: string; p256dh: string; auth: string }> }>();
  for (const l of linhas) {
    const g = m.get(l.envio_id) ?? { envio_id: l.envio_id, categoria: l.categoria, mensagem: l.mensagem, aparelhos: [] };
    if (!g.aparelhos.some((a) => a.endpoint === l.endpoint)) g.aparelhos.push({ endpoint: l.endpoint, p256dh: l.p256dh, auth: l.auth });
    m.set(l.envio_id, g);
  }
  return [...m.values()];
}

/** Validade no serviço de push: o Bom Dia não chega atrasado; o pós-treino perde sentido depois de ~2 h. */
export const TTL_SEG: Record<CategoriaChalala, number> = { bom_dia: 45 * 60, pos_treino: 2 * 60 * 60, teste: 10 * 60 };

/** O serviço de push troca a mensagem pendente de mesmo “topic” (sem duplicar se reenviada). */
export const topicoDoEnvio = (id: string) => id.replace(/[^A-Za-z0-9]/g, "").slice(0, 32);
