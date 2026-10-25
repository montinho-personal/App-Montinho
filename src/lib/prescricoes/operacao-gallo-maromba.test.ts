import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO } from "./operacao-gallo-maromba";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO, FALHA } from "./regras";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => aud.find((t) => t.letra === l)!;

describe("prescrição Operação Gallo Maromba (Daniel) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
  });

  it("4 treinos em sequência, com os exercícios da ficha", () => {
    expect(PRESCRICAO.programa.nome).toBe("Operação Gallo Maromba");
    expect(aud.map((t) => t.letra)).toEqual(["A", "B", "C", "D"]);
    expect(T("A").itens.map((i) => i.nome)).toEqual(["Crucifixo na máquina (peck deck)", "Supino inclinado com halteres", "Supino reto na máquina", "Desenvolvimento Arnold", "Elevação lateral com halteres", "Tríceps pulley com barra W"]);
    expect(T("B").itens.map((i) => i.nome)).toEqual(["Puxada frontal aberta (pulley)", "Remada sentada pegada aberta", "Remada com halteres apoiada no banco inclinado", "Crucifixo invertido na máquina", "Rosca Scott com barra W", "Rosca martelo"]);
    expect(T("C").itens.map((i) => i.nome)).toEqual(["Prancha frontal", "Cadeira extensora", "Cadeira adutora", "Mesa flexora", "Flexora em pé unilateral", "Panturrilha no leg press"]);
    expect(T("D").itens.map((i) => i.nome)).toEqual(["Supino reto na máquina", "Puxada com triângulo (pegada neutra)", "Elevação lateral com halteres", "Elevação frontal com barra", "Rosca inclinada com halteres", "Tríceps francês na polia", "Abdominal infra no banco declinado", "Abdominal supra na polia em pé"]);
  });

  it("séries por treino iguais à ficha (A 24 · B 24 · C 22 · D 28) e repetições certas", () => {
    expect(aud.map((t) => [t.letra, t.series])).toEqual([["A", 24], ["B", 24], ["C", 22], ["D", 28]]);
    const c = PRESCRICAO.treinos.find((t) => t.letra === "C")!.exercicios;
    expect(c.map((e) => e.reps)).toEqual(["60s", "20/15/12/10", "20/15/12/10", "20/15/12/10", "15/12/10/10", "20/20/15/15"]);
    const d = PRESCRICAO.treinos.find((t) => t.letra === "D")!.exercicios;
    expect(d.map((e) => e.reps)).toEqual(["20/15/12/10", "15/12/10/10", "12", "12", "15/12/10/10", "20/15/12/10", "8", "20"]);
  });

  it("padrão do Montinho: até a falha, aquecimento no 1º (na extensora quando abre com prancha), bi-sets sem descanso entre os dois", () => {
    for (const t of PRESCRICAO.treinos) {
      const regra = t.exercicios.filter((e) => e.nome !== "Prancha frontal");
      expect(regra[0].observacoes).toContain(AQUECIMENTO);
      for (const e of regra.slice(1)) expect(e.observacoes).toContain(FALHA);
      for (const e of regra) expect(e.rir).toBe(0);
    }
    const blocos = PRESCRICAO.treinos.flatMap((t) => t.exercicios.filter((e) => e.bloco).map((e) => [e.nome, e.bloco, e.descanso_seg]));
    expect(blocos).toEqual([
      ["Desenvolvimento Arnold", "A1", 0], ["Elevação lateral com halteres", "A1", null],
      ["Rosca Scott com barra W", "B1", 0], ["Rosca martelo", "B1", null],
      ["Elevação lateral com halteres", "D1", 0], ["Elevação frontal com barra", "D1", null],
      ["Abdominal infra no banco declinado", "D2", 0], ["Abdominal supra na polia em pé", "D2", null],
    ]);
  });

  it("aparece só para o Daniel", () => {
    expect(prescricoesParaAluno("Daniel Galo").map((p) => p.id)).toEqual(["operacao-gallo-maromba-v1"]);
    expect(prescricoesParaAluno("Guilherme Henrique Senna Parussolo").map((p) => p.id)).not.toContain("operacao-gallo-maromba-v1");
  });
});
