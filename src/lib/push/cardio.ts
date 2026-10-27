// ============================================================================
// Lembrete de cardio no celular (0101) — textos (PURO, testado).
// QUANDO enviar fica no banco (cardio_notificacoes_devidas): 17h–21h, só com
// cardio prescrito, sem cardio hoje, meta da semana ainda aberta, sem dor,
// máx. 1 por dia e 3 por semana. Tom: convite leve, sem culpa, sem calorias.
// ============================================================================

import { infoModalidade } from "@/lib/cardio/modalidades";
import type { MensagemPush } from "./mensagem";

export type DadosCardio = { nome?: string | null; modalidade?: string | null; duracao_min?: number | null; falta_min?: number | null; falta_dias?: number | null; dias_restantes?: number | null };

export const URL_CARDIO = "/aluno/cardio";
export const TTL_CARDIO_SEG = 3 * 60 * 60;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** “esteira”, “caminhada”… ou “o cardio que você escolher” (prescrição livre). */
export function nomeDoCardio(modalidade: string | null | undefined): string {
  if (!modalidade || modalidade === "livre") return "o cardio que você escolher";
  return infoModalidade(modalidade as never).nome.toLowerCase();
}

export function mensagemCardio(id: string, d: DadosCardio): MensagemPush & { id: string } {
  const nome = d.nome?.trim() ? `${d.nome.trim()}, ` : "";
  const cardio = nomeDoCardio(d.modalidade);
  const min = d.duracao_min && d.duracao_min > 0 ? d.duracao_min : null;
  const falta = Math.max(0, d.falta_min ?? 0);
  const fimDaSemana = (d.dias_restantes ?? 7) <= 2 && falta > 0;
  let titulo: string;
  let corpo: string;
  if (fimDaSemana) {
    titulo = `⏳ Faltam ${falta} min para fechar a semana`;
    corpo = `${nome}seu cardio da semana está quase lá. ${d.dias_restantes === 1 ? "Hoje é o último dia" : "Restam 2 dias"}: bora fechar com chave de ouro?`;
  } else {
    const opcoes = [
      { titulo: "❤️‍🔥 Bora pro cardio de hoje?", corpo: `${nome}seu cardio de hoje está te esperando${min ? `: ${min} min de ${cardio}` : ""}. O que conta é a constância!` },
      { titulo: "Cardio bom é cardio bem feito!", corpo: `${nome}ainda dá tempo de fazer o cardio de hoje${min ? `: ${min} min de ${cardio}` : ""}. No seu ritmo, sem pressa.` },
      { titulo: "Bora de Chalalá no cardio?", corpo: `${nome}${min ? `${min} minutinhos de ${cardio}` : "uns minutinhos de cardio"} e o dia fica completo. Depois é só anotar no app!` },
    ];
    ({ titulo, corpo } = opcoes[hash(id) % opcoes.length]);
  }
  // Primeira letra maiúscula quando começa pelo nome em minúscula ou pelo texto.
  corpo = corpo.charAt(0).toUpperCase() + corpo.slice(1);
  return { id, titulo, corpo, url: URL_CARDIO, tag: "cardio" };
}
