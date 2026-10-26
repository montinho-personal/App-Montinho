// ============================================================================
// Montinho Pulso — “antes de perguntar, consulte o que já sabemos”.
// Converte as respostas que o app JÁ coleta em outras telas para as dimensões
// do Pulso, para não perguntar de novo a mesma coisa no mesmo dia:
//   • pergunta antes do treino (training_sessions.checkin_pre)
//   • “como está seu corpo?” do treino extra (recuperacao)
//   • “dor” no fim do treino (feedback_percepcao)
//   • check-in diário antigo 1–10 (check_ins: energia, sono, dor, motivação)
//   • dificuldades do onboarding do visitante (perfil_visitante.dificuldades)
// E faz o caminho de volta: o Pulso grava o checkin_pre equivalente, para tudo
// que já depende dele (subir peso, “Vai que tá fácil”, confiança) seguir igual.
// ============================================================================

import type { Dimensao } from "./perguntas";

export type OrigemPulso = "pulso" | "pre_treino" | "extra" | "fim_treino" | "diario_antigo" | "onboarding";

export type RespostaPulso = { dimensao: Dimensao; valor: string; em: string; origem: OrigemPulso };

/** Resultado de uma fonte: as respostas e se a pessoa escolheu não responder. */
export type Leitura = { respostas: RespostaPulso[]; pulou: boolean };

const r = (dimensao: Dimensao, valor: string, em: string, origem: OrigemPulso): RespostaPulso => ({ dimensao, valor, em, origem });

export type CheckinPre = "muito_bem" | "normal" | "cansado" | "desconforto" | "prefiro_nao";

/** Pergunta antiga antes do treino → Pulso. */
export function doPreTreino(v: CheckinPre | string | null | undefined, em: string): Leitura {
  switch (v) {
    case "muito_bem": return { respostas: [r("energia", "alta", em, "pre_treino"), r("recuperacao", "bem", em, "pre_treino")], pulou: false };
    case "normal": return { respostas: [r("energia", "normal", em, "pre_treino")], pulou: false };
    case "cansado": return { respostas: [r("recuperacao", "um_pouco_cansado", em, "pre_treino")], pulou: false };
    case "desconforto": return { respostas: [r("recuperacao", "desconforto", em, "pre_treino")], pulou: false };
    case "prefiro_nao": return { respostas: [], pulou: true };
    default: return { respostas: [], pulou: false };
  }
}

/** “Como está seu corpo?” do treino extra → Pulso. */
export function doExtra(v: string | null | undefined, em: string): Leitura {
  switch (v) {
    case "bem": return { respostas: [r("recuperacao", "bem", em, "extra")], pulou: false };
    case "cansado": return { respostas: [r("recuperacao", "um_pouco_cansado", em, "extra")], pulou: false };
    case "dor_leve":
    case "dor_moderada":
    case "dor": return { respostas: [r("recuperacao", "desconforto", em, "extra")], pulou: false };
    case "prefiro_nao": return { respostas: [], pulou: true };
    default: return { respostas: [], pulou: false };
  }
}

/** “Como foi o treino?” = dor → desconforto naquele dia. As outras opções falam de esforço, não de bem-estar. */
export function doFimTreino(v: string | null | undefined, em: string): Leitura {
  return { respostas: v === "dor" ? [r("recuperacao", "desconforto", em, "fim_treino")] : [], pulou: false };
}

const faixa = (n: number, cortes: number[], valores: string[]) => valores[cortes.findIndex((c) => n <= c)] ?? valores[valores.length - 1];

/** Check-in diário antigo (réguas 1–10) → Pulso. Dor 1 = nenhuma; 4+ = desconforto. */
export function doDiarioAntigo(c: { energia?: number | null; sono?: number | null; dor?: number | null; motivacao?: number | null; created_at: string }): Leitura {
  const out: RespostaPulso[] = [];
  const em = c.created_at;
  if (c.energia != null) out.push(r("energia", faixa(c.energia, [2, 4, 6, 8], ["muito_baixa", "baixa", "normal", "alta", "muito_alta"]), em, "diario_antigo"));
  if (c.motivacao != null) out.push(r("motivacao", faixa(c.motivacao, [2, 4, 7], ["nenhuma", "pouca", "normal", "muita"]), em, "diario_antigo"));
  if (c.sono != null) out.push(r("sono", faixa(c.sono, [2, 4, 6, 8], ["muito_mal", "mal", "razoavel", "bem", "muito_bem"]), em, "diario_antigo"));
  if (c.dor != null && c.dor >= 4) out.push(r("recuperacao", "desconforto", em, "diario_antigo"));
  return { respostas: out, pulou: false };
}

const DIF_ONBOARDING: Record<string, string> = { tempo: "falta_tempo", constancia: "rotina_corrida", motivacao: "desmotivacao", nao_sei_montar: "exercicios", nao_sei_executar: "exercicios" };

/** Dificuldades do onboarding do visitante → ponto de partida da dimensão “dificuldade”. */
export function doOnboarding(dificuldades: string[] | null | undefined, em: string | null | undefined): Leitura {
  if (!em || !dificuldades?.length) return { respostas: [], pulou: false };
  const vals = [...new Set(dificuldades.map((d) => DIF_ONBOARDING[d]).filter(Boolean))];
  return { respostas: vals.map((v) => r("dificuldade", v, em, "onboarding")), pulou: false };
}

/**
 * Caminho de volta: o valor antigo de checkin_pre equivalente às respostas do
 * Pulso de hoje (o treino já usa esse campo para cuidar de quem está com dor).
 */
export function checkinPreDoPulso(hoje: Partial<Record<Dimensao, string | string[]>>, pulou = false): CheckinPre | null {
  const rec = hoje.recuperacao;
  const ene = hoje.energia;
  if (rec === "desconforto") return "desconforto";
  if (rec === "muito_cansado" || rec === "um_pouco_cansado" || ene === "baixa" || ene === "muito_baixa") return "cansado";
  if ((ene === "alta" || ene === "muito_alta") && (rec === undefined || rec === "bem")) return "muito_bem";
  if (ene !== undefined || rec !== undefined) return "normal";
  return pulou ? "prefiro_nao" : null;
}
