// Enviar a mobilidade para um aluno pelo WhatsApp (pedido do Montinho,
// 29/10/2026: “o aluno comentou que está com dores… eu entro e já envio”).
// PURO: monta o texto; o link do WhatsApp é o `linkWhatsApp` de sempre.
import { linkVideo, PROTOCOLOS, type SlugMobilidade } from "./protocolos";

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || "";

export function mensagemMobilidade(nome: string, slug: SlugMobilidade, origem: string): string {
  const p = PROTOCOLOS[slug];
  const oi = primeiroNome(nome);
  return [
    `Oi${oi ? `, ${oi}` : ""}! Separei para você a ${p.nome} (~${p.minutos} min), para fazer junto com o meu vídeo.`,
    "",
    `Abre pelo app e toca em ▶ Começar (assim conta para os troféus): ${origem.replace(/\/$/, "")}/aluno/mobilidade/${slug}`,
    "",
    `Vídeo: ${linkVideo(p)}`,
    "",
    "Desconforto leve é normal. Dor aguda, choque ou formigamento: pare e me avise.",
  ].join("\n");
}
