import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO } from "./operacao-mr-arena-18";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO, FALHA } from "./regras";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => aud.find((t) => t.letra === l)!;

describe("prescrição Operação Mr Arena 18 (Guilherme) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
  });

  it("3 treinos em sequência, com o nome da operação", () => {
    expect(PRESCRICAO.programa.nome).toBe("Operação Mr Arena 18");
    expect(aud.map((t) => t.letra)).toEqual(["A", "B", "C"]);
    expect(T("A").itens.map((i) => i.nome)).toEqual(["Crucifixo na máquina (peck deck)", "Supino inclinado com halteres", "Supino reto na máquina", "Desenvolvimento Arnold", "Elevação lateral com halteres", "Tríceps pulley com barra W"]);
    expect(T("B").itens.map((i) => i.nome)).toEqual(["Cadeira extensora", "Agachamento no Smith", "Leg press 45°", "Mesa flexora", "Panturrilha no leg press"]);
    expect(T("C").itens.map((i) => i.nome)).toEqual(["Puxada frontal aberta (pulley)", "Remada sentada pegada aberta", "Remada unilateral com halter (serrote)", "Crucifixo invertido na máquina", "Rosca Scott com barra W", "Abdominal supra na polia em pé"]);
  });

  it("séries por treino iguais à ficha (A 24 · B 20 · C 24) e pirâmides certas", () => {
    expect(aud.map((t) => [t.letra, t.series])).toEqual([["A", 24], ["B", 20], ["C", 24]]);
    const b = PRESCRICAO.treinos.find((t) => t.letra === "B")!.exercicios;
    expect(b.map((e) => e.reps)).toEqual(["20/15/12/10", "15/12/10/10", "15/12/10/10", "20/15/12/10", "20/20/15/15"]);
  });

  it("padrão do Montinho: até a falha, aquecimento no 1º, bi-set sem descanso entre os dois", () => {
    for (const t of PRESCRICAO.treinos) {
      expect(t.exercicios[0].observacoes).toContain(AQUECIMENTO);
      for (const e of t.exercicios.slice(1)) expect(e.observacoes).toContain(FALHA);
      for (const e of t.exercicios) expect(e.rir).toBe(0);
    }
    const arnold = PRESCRICAO.treinos[0].exercicios.find((e) => e.nome === "Desenvolvimento Arnold")!;
    expect([arnold.bloco, arnold.descanso_seg, arnold.descanso_apos_seg]).toEqual(["A1", 0, 0]);
  });

  it("aparece só para o Guilherme", () => {
    expect(prescricoesParaAluno("Guilherme Henrique Senna Parussolo").map((p) => p.id)).toEqual(["operacao-mr-arena-18-v1"]);
    expect(prescricoesParaAluno("Denis Cruz").map((p) => p.id)).not.toContain("operacao-mr-arena-18-v1");
  });
});
