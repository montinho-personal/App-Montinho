import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO, PENDENCIAS } from "./hipertrofia-esther-intensificacao";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO, FALHA } from "./regras";

const aud = auditarPrescricao(PRESCRICAO);
const reps = (l: string) => PRESCRICAO.treinos.find((t) => t.letra === l)!.exercicios.map((e) => e.reps);

describe("prescrição Hipertrofia - Intensificação (Esther) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod) e está na fase de intensificação", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
    expect(PRESCRICAO.programa.fase).toBe("intensificacao");
  });

  it("4 treinos com os exercícios da ficha (6, 6, 7 e 6 exercícios) e as repetições", () => {
    expect(aud.map((t) => [t.letra, t.exercicios, t.posicoes])).toEqual([["A", 6, 6], ["B", 6, 5], ["C", 7, 6], ["D", 6, 5]]);
    expect(reps("A")).toEqual(["60s", "15/12/10/10", "15/12/10/10", "20/15/12/10", "20/15/12/10", "10"]);
    expect(reps("B")).toEqual(["20/15/12/10", "20/15/12/10", "20/15/12/10", "10", "10", "15"]);
    expect(reps("C")).toEqual(["60s", "20/15/12/10", "12/12/10/10", "15/12/10/10", "20/15/12/10", "10", "15"]);
    expect(reps("D")).toEqual(["20/15/12/10", "20/15/12/10", "12/12/10/10", "12/12/10/10", "20/15/12/10", "12"]);
  });

  it("drop-set e rest-pause como série de finalização; bi-sets sem descanso entre os dois", () => {
    const fin = PRESCRICAO.treinos.flatMap((t) => t.exercicios.filter((e) => e.tecnica_config).map((e) => [t.letra, e.nome, e.tecnica]));
    expect(fin).toEqual([["A", "Cadeira extensora", "dropset"], ["A", "Hip thrust com barra", "rest_pause"], ["C", "Hip thrust com barra", "rest_pause"], ["C", "Mesa flexora", "dropset"]]);
    const blocos = PRESCRICAO.treinos.flatMap((t) => t.exercicios.filter((e) => e.bloco).map((e) => [e.bloco, e.descanso_seg]));
    expect(blocos).toEqual([["B1", 0], ["B1", null], ["C1", 0], ["C1", null], ["D1", 0], ["D1", null]]);
  });

  it("padrão do Montinho: até a falha e aquecimento no 1º (depois da prancha)", () => {
    for (const t of PRESCRICAO.treinos) {
      const regra = t.exercicios.filter((e) => e.nome !== "Prancha frontal");
      expect(regra[0].observacoes).toContain(AQUECIMENTO);
      for (const e of regra.slice(1)) expect(e.observacoes).toContain(FALHA);
    }
  });

  it("aparece só para a Esther", () => {
    expect(prescricoesParaAluno("Esther Claro").map((p) => p.id)).toEqual(["hipertrofia-esther-intensificacao-v1"]);
    expect(prescricoesParaAluno("Camilla L Valentim").map((p) => p.id)).not.toContain("hipertrofia-esther-intensificacao-v1");
    expect(PENDENCIAS).toHaveLength(0);
  });
});
