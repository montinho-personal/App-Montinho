import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO } from "./operacao-forca-bruta";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO, FALHA } from "./regras";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => aud.find((t) => t.letra === l)!;

describe("prescrição Operação Força Bruta (Leandro) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
  });

  it("5 treinos em sequência, com os exercícios da ficha (sem nome de marca)", () => {
    expect(PRESCRICAO.programa.nome).toBe("Operação Força Bruta");
    expect(JSON.stringify(PRESCRICAO)).not.toMatch(/hulk/i);
    expect(aud.map((t) => t.letra)).toEqual(["A", "B", "C", "D", "E"]);
    expect(T("A").itens.map((i) => i.nome)).toEqual(["Crucifixo na máquina (peck deck)", "Supino inclinado com halteres", "Supino reto na máquina", "Elevação lateral com halteres", "Tríceps francês na polia", "Abdominal supra na polia em pé"]);
    expect(T("B").itens.map((i) => i.nome)).toEqual(["Prancha frontal", "Puxada frontal aberta (pulley)", "Puxada com triângulo (pegada neutra)", "Remada unilateral com halter (serrote)", "Crucifixo invertido na máquina", "Rosca Scott com barra W", "Rosca martelo"]);
    expect(T("C").itens.map((i) => i.nome)).toEqual(["Prancha frontal", "Cadeira extensora", "Leg press 45°", "Cadeira flexora", "Mesa flexora", "Cadeira abdutora", "Panturrilha no leg press"]);
    expect(T("D").itens.map((i) => i.nome)).toEqual(["Crossover na polia alta", "Supino reto com halteres", "Desenvolvimento Arnold", "Elevação lateral com halteres", "Tríceps pulley com barra W", "Abdominal infra no banco declinado"]);
    expect(T("E").itens.map((i) => i.nome)).toEqual(["Prancha frontal", "Remada sentada pegada aberta", "Remada sentada na polia (triângulo)", "Face pull", "Rosca direta com barra reta", "Rosca inversa na polia com barra W", "Rosca martelo", "Abdominal remador"]);
  });

  it("séries por treino iguais à ficha (A 24 · B 26 · C 26 · D 24 · E 30) e repetições certas", () => {
    expect(aud.map((t) => [t.letra, t.series])).toEqual([["A", 24], ["B", 26], ["C", 26], ["D", 24], ["E", 30]]);
    const c = PRESCRICAO.treinos.find((t) => t.letra === "C")!.exercicios;
    expect(c.map((e) => e.reps)).toEqual(["60s", "20/15/12/10", "15/12/10/10", "20/15/12/10", "15/12/10/10", "20", "20"]);
    const e = PRESCRICAO.treinos.find((t) => t.letra === "E")!.exercicios;
    expect(e.map((x) => x.reps)).toEqual(["60s", "20/15/12/10", "20/15/12/10", "20/15/12/10", "12", "15", "15", "15"]);
  });

  it("padrão do Montinho: até a falha, aquecimento no 1º (no 2º quando abre com prancha), bi-sets sem descanso entre os dois", () => {
    for (const t of PRESCRICAO.treinos) {
      const regra = t.exercicios.filter((e) => e.nome !== "Prancha frontal");
      expect(regra[0].observacoes).toContain(AQUECIMENTO);
      for (const e of regra.slice(1)) expect(e.observacoes).toContain(FALHA);
      for (const e of regra) expect(e.rir).toBe(0);
    }
    const blocos = PRESCRICAO.treinos.flatMap((t) => t.exercicios.filter((e) => e.bloco).map((e) => [e.nome, e.bloco, e.descanso_seg]));
    expect(blocos).toEqual([
      ["Desenvolvimento Arnold", "D1", 0], ["Elevação lateral com halteres", "D1", null],
      ["Rosca inversa na polia com barra W", "E1", 0], ["Rosca martelo", "E1", null],
    ]);
  });

  it("aparece só para o Leandro", () => {
    expect(prescricoesParaAluno("Leandro Perez").map((p) => p.id)).toEqual(["operacao-forca-bruta-v1"]);
    expect(prescricoesParaAluno("Daniel Galo").map((p) => p.id)).not.toContain("operacao-forca-bruta-v1");
  });
});
