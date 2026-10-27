import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO } from "./projeto-deusa-dos-gluteos";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO, FALHA } from "./regras";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => PRESCRICAO.treinos.find((t) => t.letra === l)!.exercicios;

describe("prescrição Projeto Deusa dos Glúteos (Nathalia) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
  });

  it("5 treinos em sequência, com os exercícios da ficha", () => {
    expect(aud.map((t) => [t.letra, t.itens.length])).toEqual([["A", 6], ["B", 6], ["C", 5], ["D", 6], ["E", 6]]);
    expect(T("A").map((e) => e.nome)).toEqual(["Cadeira abdutora", "Agachamento búlgaro", "Hip thrust com barra", "Cadeira flexora", "Stiff com halteres", "Panturrilha no leg press"]);
    expect(T("B").map((e) => e.nome)).toEqual(["Remada sentada pegada aberta", "Puxada frontal aberta (pulley)", "Elevação lateral com halteres", "Crucifixo invertido na máquina", "Rosca martelo", "Abdominal supra na polia em pé"]);
    expect(T("C").map((e) => e.nome)).toEqual(["Agachamento no Smith", "Leg press 45°", "Cadeira extensora", "Cadeira abdutora", "Panturrilha no leg press 45°"]);
    expect(T("D").map((e) => e.nome)).toEqual(["Crucifixo na máquina (peck deck)", "Remada unilateral com halter (serrote)", "Desenvolvimento Arnold", "Elevação lateral com halteres", "Tríceps francês na polia", "Abdominal infra no banco declinado"]);
    expect(T("E").map((e) => e.nome)).toEqual(["Cadeira abdutora", "Levantamento terra sumô", "Leg press horizontal", "Mesa flexora", "Stiff com halteres", "Panturrilha no leg press"]);
  });

  it("repetições da ficha (pirâmides 20/15/12/10, 15/12/10/10, 12/12/10/10 e 20/20/15/12)", () => {
    expect(T("A").map((e) => e.reps)).toEqual(["20/15/12/10", "12/12/10/10", "15/12/10/10", "20/15/12/10", "10", "15"]);
    expect(T("C").map((e) => e.reps)).toEqual(["15/12/10/10", "15/12/10/10", "20/15/12/10", "20/15/12/10", "20/20/15/12"]);
    expect(T("D").map((e) => e.reps)).toEqual(["20/15/12/10", "20/15/12/10", "12/12/10/10", "12/12/10/10", "20/15/12/10", "12"]);
  });

  it("drop-set e rest-pause como série de finalização, onde a ficha marca", () => {
    const finais = PRESCRICAO.treinos.flatMap((t) => t.exercicios.filter((e) => e.tecnica_config).map((e) => [t.letra, e.nome, e.tecnica]));
    expect(finais).toEqual([
      ["A", "Hip thrust com barra", "rest_pause"], ["A", "Cadeira flexora", "dropset"],
      ["C", "Leg press 45°", "rest_pause"], ["C", "Cadeira extensora", "dropset"],
      ["E", "Leg press horizontal", "dropset"], ["E", "Mesa flexora", "rest_pause"],
    ]);
  });

  it("padrão do Montinho: até a falha, aquecimento no 1º, bi-sets sem descanso entre os dois", () => {
    for (const t of PRESCRICAO.treinos) {
      expect(t.exercicios[0].observacoes).toContain(AQUECIMENTO);
      for (const e of t.exercicios.slice(1)) expect(e.observacoes).toContain(FALHA);
      for (const e of t.exercicios) expect(e.rir).toBe(0);
    }
    const blocos = PRESCRICAO.treinos.flatMap((t) => t.exercicios.filter((e) => e.bloco).map((e) => [e.nome, e.bloco, e.descanso_seg]));
    expect(blocos).toEqual([
      ["Stiff com halteres", "A1", 0], ["Panturrilha no leg press", "A1", null],
      ["Crucifixo invertido na máquina", "B1", 0], ["Rosca martelo", "B1", null],
      ["Desenvolvimento Arnold", "D1", 0], ["Elevação lateral com halteres", "D1", null],
      ["Stiff com halteres", "E1", 0], ["Panturrilha no leg press", "E1", null],
    ]);
  });

  it("aparece só para a Nathalia", () => {
    expect(prescricoesParaAluno("Nathalia Berti Cardozo").map((p) => p.id)).toEqual(["projeto-deusa-dos-gluteos-v1"]);
    expect(prescricoesParaAluno("Leandro Perez").map((p) => p.id)).not.toContain("projeto-deusa-dos-gluteos-v1");
  });
});
