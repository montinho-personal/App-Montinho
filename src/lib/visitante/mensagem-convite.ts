import { DIAS_PADRAO, type ConviteRegra } from "./acesso";

type Prazo = Pick<ConviteRegra, "tipo_acesso" | "dias" | "acesso_ate">;

/** "30 dias grátis", "acesso grátis até 30/11/2026" ou "acesso grátis". */
export function ofertaDoConvite(c: Prazo): string {
  if (c.tipo_acesso === "permanente") return "acesso grátis";
  if (c.tipo_acesso === "ate_data" && c.acesso_ate) return `acesso grátis até ${c.acesso_ate.split("-").reverse().join("/")}`;
  const n = c.dias ?? DIAS_PADRAO;
  return `${n} ${n === 1 ? "dia" : "dias"} grátis`;
}

/**
 * Texto do Montinho (30/10/2026): convite que vende o app — benefícios, a
 * missão (constância, o treino certo de verdade) e como deixar o app na tela
 * do celular, no iPhone e no Android. Sem pronome de gênero.
 */
export function mensagemDoConvite(oferta: string, link: string, marca: string): string {
  return [
    "Olá, tudo bem? 😊",
    `Estou te convidando para conhecer o app do ${marca}, e já liberei *${oferta}* pra você! 💪`,
    "",
    "Nossa missão é simples: fazer você *não parar*. Treino bom é o que acontece toda semana, e o app foi feito para isso: te manter no ritmo, com motivação e resultado que dá para ver.",
    "",
    "*O que você ganha:*",
    "📋 Seu treino no celular, exercício por exercício, com vídeo de como fazer",
    "📈 Anota carga e repetições e o app mostra quando você evolui (e avisa a hora de subir o peso)",
    "🔥 Meta da semana e constância: você enxerga o seu compromisso",
    "🏆 Troféus, Jornada do Chalalá e ranking da galera",
    "⚔️ Desafios com amigos, cardio e mobilidade no mesmo lugar",
    "🔔 Lembretes no celular para não deixar o treino passar",
    "",
    "*Como começar:*",
    `1️⃣ Toque no link e crie sua conta: ${link}`,
    "2️⃣ Já dentro do app, deixe ele na tela do celular, como um aplicativo:",
    "🍎 *iPhone:* abra no *Safari*, toque em Compartilhar (o quadrado com a setinha ⬆️) e depois em *Adicionar à Tela de Início*.",
    "🤖 *Android:* abra no *Chrome*, toque nos 3 pontinhos ⋮ e depois em *Instalar app* (ou *Adicionar à tela inicial*).",
    "3️⃣ Quando o app pedir, ative as notificações para receber os lembretes.",
    "",
    "Qualquer dúvida, me chama aqui. Bora pra cima? Chalalá! 🚀",
  ].join("\n");
}
