// Padrão do personal para toda ficha (pedido do Montinho, 22/10/2026):
//  • todo exercício até a falha muscular (RIR 0, com a observação);
//  • o 1º exercício de cada treino leva o aquecimento (2 séries leves);
//  • se o 1º for prancha (ou outro isométrico/cardio), o aquecimento vai no
//    seguinte e ele fica fora da regra da falha.
import type { ExercicioInput, TreinoInput } from "@/lib/data/programas";

export const FALHA = "Chegar todas até a falha!";
export const AQUECIMENTO = "Antes: 2 séries de aquecimento com pouco peso, sem chegar na falha. Depois, chegar todas até a falha!";

const POR_TEMPO = /\b(prancha|plank|cadeirinha|wall ?sit|hollow|isometric[ao]|esteira|bicicleta ergometrica|eliptico|escada|caminhada|corrida)\b/;
const semAcento = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Fica fora da regra: isométrico por natureza, cardio ou exercício que não conta volume. */
export function foraDaRegra(e: Pick<ExercicioInput, "nome" | "grupo_muscular" | "conta_volume">): boolean {
  return POR_TEMPO.test(semAcento(e.nome)) || e.grupo_muscular === "cardio" || e.conta_volume === false;
}

/** Observação com o padrão no fim (sem repetir o que já estiver lá). */
export function obsComPadrao(obs: string | null | undefined, primeiro: boolean): string {
  const limpa = (obs ?? "").replace(AQUECIMENTO, " ").replace(/\s*Chegar todas até a falha!?\s*/gi, " ").trim();
  return [limpa || null, primeiro ? AQUECIMENTO : FALHA].filter(Boolean).join(" ");
}

/** Aplica o padrão (falha + aquecimento no 1º exercício) a um treino. */
export function comRegras(t: TreinoInput): TreinoInput {
  const primeiro = t.exercicios.findIndex((e) => !foraDaRegra(e));
  return {
    ...t,
    exercicios: t.exercicios.map((e, i) => (foraDaRegra(e) ? e : { ...e, rir: 0, observacoes: obsComPadrao(e.observacoes, i === primeiro) })),
  };
}

/** Quantos exercícios (dos treinos ativos) ainda não seguem o padrão. */
export function exerciciosForaDoPadrao(treinos: TreinoInput[]): number {
  let n = 0;
  for (const t of treinos) {
    if (!t.ativo) continue;
    const ajustado = comRegras(t);
    t.exercicios.forEach((e, i) => {
      const a = ajustado.exercicios[i];
      if (a.rir !== e.rir || (a.observacoes ?? "") !== (e.observacoes ?? "")) n++;
    });
  }
  return n;
}
