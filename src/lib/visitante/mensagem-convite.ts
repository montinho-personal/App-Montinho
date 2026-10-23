import { DIAS_PADRAO, type ConviteRegra } from "./acesso";

/**
 * O texto que o treinador manda no WhatsApp junto com o link do convite.
 *
 * Texto do Montinho (23/10/2026): a pessoa coloca o treino que já faz,
 * acompanha a evolução e entra no ranking de troféus. A oferta muda com o
 * prazo do convite, para nunca prometer 30 dias num convite de 7.
 */

type Prazo = Pick<ConviteRegra, "tipo_acesso" | "dias" | "acesso_ate">;

/** "30 dias grátis", "acesso grátis até 30/11/2026" ou "acesso grátis". */
export function ofertaDoConvite(c: Prazo): string {
  if (c.tipo_acesso === "permanente") return "acesso grátis";
  if (c.tipo_acesso === "ate_data" && c.acesso_ate) return `acesso grátis até ${c.acesso_ate.split("-").reverse().join("/")}`;
  const n = c.dias ?? DIAS_PADRAO;
  return `${n} ${n === 1 ? "dia" : "dias"} grátis`;
}

export function mensagemDoConvite(oferta: string, link: string, marca: string): string {
  return [
    `Oi! Liberei pra você ${oferta} no app do ${marca} 💪`,
    "",
    "Dá pra cadastrar o treino que você já faz hoje, exercício por exercício. A cada treino você registra a carga e as repetições, e o app guarda tudo:",
    "✅ vê se a carga está subindo ou se parou",
    "✅ acompanha a sua constância semana a semana",
    "✅ ganha medalhas na Jornada do Chalalá",
    `🏆 e entra no ranking de troféus dos alunos do ${marca}`,
    "",
    "É só tocar no link e criar a sua conta:",
    link,
    "",
    "Qualquer dúvida pra montar, me chama aqui. Chalalá!",
  ].join("\n");
}
