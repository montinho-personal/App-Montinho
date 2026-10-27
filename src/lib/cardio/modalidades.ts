// ============================================================================
// Montinho Cardio — modalidades (lista única; nova modalidade = 1 linha aqui
// + o valor no check do banco). Rótulos e o que cada uma pede no registro.
// ============================================================================

import type { IntensidadeCardio, ModalidadeCardio, ModalidadePrescricao } from "@/lib/supabase/types-extended";

export type InfoModalidade = { nome: string; emoji: string; distancia: boolean; velocidade: boolean; inclinacao: boolean };

export const MODALIDADES: Record<ModalidadeCardio, InfoModalidade> = {
  caminhada: { nome: "Caminhada", emoji: "🚶", distancia: true, velocidade: false, inclinacao: false },
  corrida: { nome: "Corrida", emoji: "🏃", distancia: true, velocidade: false, inclinacao: false },
  esteira: { nome: "Esteira", emoji: "🏃", distancia: true, velocidade: true, inclinacao: true },
  bike_ergometrica: { nome: "Bicicleta ergométrica", emoji: "🚴", distancia: true, velocidade: false, inclinacao: false },
  bike: { nome: "Bicicleta ao ar livre", emoji: "🚴", distancia: true, velocidade: false, inclinacao: false },
  eliptico: { nome: "Elíptico", emoji: "🏃", distancia: false, velocidade: false, inclinacao: false },
  escada: { nome: "Escada", emoji: "🪜", distancia: false, velocidade: false, inclinacao: false },
  remo: { nome: "Remo", emoji: "🚣", distancia: true, velocidade: false, inclinacao: false },
  natacao: { nome: "Natação", emoji: "🏊", distancia: true, velocidade: false, inclinacao: false },
  corda: { nome: "Pular corda", emoji: "🪢", distancia: false, velocidade: false, inclinacao: false },
  hiit: { nome: "HIIT", emoji: "🔥", distancia: false, velocidade: false, inclinacao: false },
  outro: { nome: "Outro cardio", emoji: "❤️", distancia: true, velocidade: false, inclinacao: false },
};

export const MODALIDADE_IDS = Object.keys(MODALIDADES) as ModalidadeCardio[];

/** Prescrição “livre”: o personal deixa o aluno escolher. */
export const MODALIDADE_LIVRE: InfoModalidade = { nome: "Livre (o aluno escolhe)", emoji: "🎯", distancia: true, velocidade: false, inclinacao: false };
export const infoModalidade = (m: ModalidadePrescricao): InfoModalidade => (m === "livre" ? MODALIDADE_LIVRE : MODALIDADES[m]);

/** Quando fazer o cardio. “Tanto faz” é o padrão: cardio bom é cardio bem feito. */
export const VINCULOS = { qualquer: "Tanto faz", independente: "Sessão separada", apos_treino: "Depois da musculação", antes_treino: "Antes da musculação" } as const;

export const INTENSIDADES: Record<IntensidadeCardio, { nome: string; dica: string; esforco: [number, number] }> = {
  leve: { nome: "Leve", dica: "Dá para conversar tranquilo", esforco: [1, 4] },
  moderada: { nome: "Moderada", dica: "Conversa em frases curtas", esforco: [4, 6] },
  forte: { nome: "Forte", dica: "Difícil falar", esforco: [7, 9] },
};

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Extra de cardio liberado pelo personal → modalidade (o título diz qual é, quando dá). */
export function modalidadeDoTexto(texto: string | null | undefined): ModalidadeCardio {
  const t = (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/esteira/.test(t)) return "esteira";
  if (/corrid|correr|run/.test(t)) return "corrida";
  if (/caminhad|andar/.test(t)) return "caminhada";
  if (/ergometr|spinning|bike ergo/.test(t)) return "bike_ergometrica";
  if (/bike|bicicleta|pedal/.test(t)) return "bike";
  if (/eliptic|transport/.test(t)) return "eliptico";
  if (/escada|stair/.test(t)) return "escada";
  if (/remo|row/.test(t)) return "remo";
  if (/nata|nadar|piscina/.test(t)) return "natacao";
  if (/corda/.test(t)) return "corda";
  if (/hiit|tabata|intervalad/.test(t)) return "hiit";
  return "outro";
}

/** sport_type do Strava → modalidade do app. */
export function modalidadeDoStrava(tipo: string): ModalidadeCardio {
  if (/VirtualRun/.test(tipo)) return "esteira";
  if (/Run/.test(tipo)) return "corrida";
  if (/Walk|Hike/.test(tipo)) return "caminhada";
  if (/VirtualRide/.test(tipo)) return "bike_ergometrica";
  if (/Ride/.test(tipo)) return "bike";
  if (/Swim/.test(tipo)) return "natacao";
  if (/Row/.test(tipo)) return "remo";
  if (/Elliptical/.test(tipo)) return "eliptico";
  if (/Stair/.test(tipo)) return "escada";
  if (/HighIntensity|Crossfit/.test(tipo)) return "hiit";
  return "outro";
}
