// ============================================================================
// Lembrete diário da mobilidade no celular (0119) — textos (PURO, testado).
// QUANDO enviar fica no banco (mobilidade_notificacoes_devidas): 11h–14h, só
// para quem tem mobilidade indicada (anamnese ou personal), ainda não fez hoje
// e não bateu os dias da semana. Sempre cita o troféu que está em jogo.
// Tom: cuidado com a saúde e o desempenho, sem culpa.
// ============================================================================
import type { MensagemPush } from "./mensagem";
import type { SlugMobilidade } from "@/lib/mobilidade/protocolos";

export type DadosMobilidade = { nome?: string | null; protocolo?: SlugMobilidade | null; protocolos?: SlugMobilidade[] | null; dias_feitos?: number | null; dias_meta?: number | null; trofeus?: string[] | null };

export const TTL_MOBILIDADE_SEG = 3 * 60 * 60;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const NOME: Record<SlugMobilidade, string> = { superiores: "Superiores", inferiores: "Inferiores" };

/** O troféu mais perto para citar (o que a pessoa ainda não tem). */
export function trofeuEmJogo(d: DadosMobilidade): string | null {
  const tem = new Set(d.trofeus ?? []);
  const p = d.protocolo ?? "superiores";
  if (!tem.has(`mobilidade_${p}`)) return p === "superiores" ? "Ombros Livres" : "Quadril Livre";
  const outro: SlugMobilidade = p === "superiores" ? "inferiores" : "superiores";
  if ((d.protocolos ?? []).includes(outro) && !tem.has("mobilidade_completa") && tem.has(`mobilidade_${outro}`)) return "Corpo Todo Solto";
  if (!tem.has(`mobilidade_7_${p}`)) return `Desafio 7 Dias: ${NOME[p]}`;
  return null;
}

export function mensagemMobilidade(id: string, d: DadosMobilidade): MensagemPush & { id: string } {
  const nome = d.nome?.trim() ? `${d.nome.trim()}, ` : "";
  const p = d.protocolo ?? "superiores";
  const trofeu = trofeuEmJogo(d);
  const premio = trofeu ? ` Vale o troféu “${trofeu}” 🏆` : "";
  const meta = d.dias_meta && d.dias_meta < 7 ? ` (${d.dias_feitos ?? 0} de ${d.dias_meta} nesta semana)` : "";
  const opcoes = [
    { titulo: "🧘 Sua mobilidade de hoje", corpo: `${nome}a Mobilidade de ${NOME[p]} está te esperando: ~20 min junto com o vídeo${meta}.${premio}` },
    { titulo: "🧘 Corpo solto, treino melhor", corpo: `${nome}20 minutinhos de mobilidade hoje cuidam das articulações e deixam o treino render mais${meta}.${premio}` },
    { titulo: "🧘 Bora soltar o corpo?", corpo: `${nome}menos travamento, mais amplitude e carga subindo com segurança. Começa pelo app e conta!${premio}` },
  ];
  const { titulo, corpo: texto } = opcoes[hash(id) % opcoes.length];
  const corpo = texto.charAt(0).toUpperCase() + texto.slice(1);
  return { id, titulo, corpo, url: `/aluno/mobilidade/${p}`, tag: "mobilidade" };
}
