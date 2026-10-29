import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO, PENDENCIAS } from "./missao-celtic-queen-intensificacao";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO, FALHA } from "./regras";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => aud.find((t) => t.letra === l)!;

describe("prescrição Missão Celtic Queen - Intensificação (Camilla) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod) e está na fase de intensificação", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
    expect(PRESCRICAO.programa.fase).toBe("intensificacao");
  });

  it("4 treinos em sequência, com os exercícios e posições da ficha (6, 6, 6 e 9 exercícios)", () => {
    expect(aud.map((t) => [t.letra, t.exercicios, t.posicoes])).toEqual([["A", 6, 5], ["B", 6, 5], ["C", 6, 5], ["D", 9, 6]]);
    expect(T("D").itens.map((i) => i.nome)).toEqual(["Agachamento no Smith", "Good morning", "Puxada frontal aberta (pulley)", "Face pull", "Elevação lateral com halteres", "Supino reto com halteres", "Tríceps francês com halter", "Abdominal remador", "Abdominal supra na polia em pé"]);
  });

  it("séries por treino iguais à ficha: B 24 · C 24 · D 38 (e A com 24 individuais)", () => {
    expect(aud.map((t) => [t.letra, t.series])).toEqual([["A", 24], ["B", 24], ["C", 24], ["D", 37]]);
    const reps = (l: string) => PRESCRICAO.treinos.find((t) => t.letra === l)!.exercicios.map((e) => e.reps);
    expect(reps("A")).toEqual(["60s", "20/15/12/10/8", "15/12/10/10/8", "20/15/12/10/8", "20", "20"]);
    expect(reps("C")).toEqual(["60s", "15", "15", "15", "20", "20/15/12/12/10"]);
    expect(reps("D")).toEqual(["20/15/12/10", "15/12/10/10/10", "20/15/12/10", "15", "15", "12", "12", "20", "20"]);
  });

  it("padrão do Montinho: até a falha, aquecimento no 1º (depois da prancha), bi-sets sem descanso entre os dois", () => {
    for (const t of PRESCRICAO.treinos) {
      const regra = t.exercicios.filter((e) => e.nome !== "Prancha frontal");
      expect(regra[0].observacoes).toContain(AQUECIMENTO);
      for (const e of regra.slice(1)) expect(e.observacoes).toContain(FALHA);
      for (const e of regra) expect(e.rir).toBe(0);
    }
    const blocos = PRESCRICAO.treinos.flatMap((t) => t.exercicios.filter((e) => e.bloco).map((e) => [e.bloco, e.descanso_seg]));
    expect(blocos).toEqual([["A1", 0], ["A1", null], ["B1", 0], ["B1", null], ["C1", 0], ["C1", null], ["D1", 0], ["D1", null], ["D2", 0], ["D2", null], ["D3", 0], ["D3", null]]);
  });

  it("aparece só para a Camilla e deixa as dúvidas registradas", () => {
    expect(prescricoesParaAluno("Camilla L Valentim").map((p) => p.id)).toEqual(["missao-celtic-queen-intensificacao-v3"]);
    expect(prescricoesParaAluno("Carol Zorzi (Carolina)").map((p) => p.id)).not.toContain("missao-celtic-queen-intensificacao-v3");
    expect(PENDENCIAS).toHaveLength(0);
  });
});
