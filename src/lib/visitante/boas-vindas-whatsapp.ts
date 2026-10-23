// Mensagem de boas-vindas que o personal manda pelo WhatsApp para cada
// visitante (botão no painel /treinador/visitantes). Texto do Montinho:
// começa com “Olá” (não “Oi”), traz o passo a passo para instalar no Android
// e no iPhone e um tutorial curto de como aproveitar o app.
// O vídeo de boas-vindas vai logo depois, anexado pelo personal na conversa
// (ou pelo link, quando VIDEO_BOAS_VINDAS_URL estiver preenchido).

import { URL_COMECE_TREINO } from "@/lib/visitante/links";

/** Link do vídeo de boas-vindas no YouTube (vazio = o personal anexa o vídeo na conversa). */
export const VIDEO_BOAS_VINDAS_URL = "";

const OBJETIVO: Record<string, string> = {
  hipertrofia: "ganhar massa muscular",
  emagrecimento: "emagrecer",
  condicionamento: "melhorar o condicionamento",
  forca: "ganhar força",
  saude: "cuidar da saúde",
};

export type DadosBoasVindas = {
  nome: string | null;
  objetivo?: string | null;
  frequenciaSemanal?: number | null;
  acessoAte?: string | null; // dd/mm/aaaa
  appUrl: string;
  videoUrl?: string;
};

export function mensagemBoasVindas(d: DadosBoasVindas): string {
  const primeiro = (d.nome ?? "").trim().split(/\s+/)[0] ?? "";
  const video = (d.videoUrl ?? VIDEO_BOAS_VINDAS_URL).trim();
  const objetivo = d.objetivo ? OBJETIVO[d.objetivo] : null;
  const meta =
    d.frequenciaSemanal && objetivo
      ? `Sua meta: ${d.frequenciaSemanal} ${d.frequenciaSemanal === 1 ? "treino" : "treinos"} por semana para ${objetivo}. Vamos juntos!`
      : d.frequenciaSemanal
        ? `Sua meta: ${d.frequenciaSemanal} ${d.frequenciaSemanal === 1 ? "treino" : "treinos"} por semana. Vamos juntos!`
        : null;
  return [
    `Olá${primeiro ? `, ${primeiro}` : ""}! Aqui é o Montinho 💪`,
    `Que bom ter você no App Montinho!${d.acessoAte ? ` Seu acesso vai até ${d.acessoAte}.` : ""}`,
    video ? `🎥 Preparei um vídeo de boas-vindas para você: ${video}` : "🎥 Logo abaixo te mando um vídeo rapidinho de boas-vindas. Assiste quando puder!",
    [
      "*Como aproveitar o app ao máximo:*",
      `1️⃣ *Deixe o app na tela do celular:* abra ${d.appUrl}`,
      "• Android: no Chrome, toque nos 3 pontinhos ⋮ › “Adicionar à tela inicial”.",
      "• iPhone: no Safari, toque em Compartilhar (quadrado com a seta) › “Adicionar à Tela de Início”.",
      "2️⃣ *Monte seus treinos* em “Meus treinos”: escolha os exercícios da biblioteca, todos com vídeo de execução, e ajuste séries, repetições e descanso.",
      "3️⃣ *Na academia, toque em “Começar treino”* e anote a carga e as repetições de cada série. No treino seguinte, o app já mostra o que você fez da última vez.",
      "📶 *Academia sem sinal?* Comece o treino com internet e depois pode marcar tudo mesmo sem conexão: fica guardado no celular e vai sozinho quando a internet voltar.",
      "4️⃣ *Acompanhe sua evolução* na aba Evolução e ganhe medalhas na Jornada.",
      `5️⃣ *Não sabe por onde começar?* Faça o caminho grátis do site (uns 10 minutos): ${URL_COMECE_TREINO}`,
    ].join("\n"),
    meta,
    "Qualquer dúvida, é só me chamar aqui. Bons treinos!",
  ]
    .filter(Boolean)
    .join("\n\n");
}
