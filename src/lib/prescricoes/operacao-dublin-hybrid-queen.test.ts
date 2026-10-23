import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { ehPorTempo } from "@/lib/treino/medida";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO, PENDENCIAS } from "./operacao-dublin-hybrid-queen";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO, FALHA } from "./regras";

const T = (l: string) => PRESCRICAO.treinos.find((t) => t.letra === l)!;
const E = (l: string, nome: string) => T(l).exercicios.find((x) => x.nome === nome)!;
const HYROX = ["Sled Push", "Battle Rope", "Farmers Carry", "Sled Pull", "Rower"];

describe("prescrição Operação Dublin Hybrid Queen (Ana) — conforme os prints do personal", () => {
  it("passa na validação do montador (zod) e na auditoria", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
    expect(auditarPrescricao(PRESCRICAO).map((t) => t.letra)).toEqual(["A", "B", "C", "D"]);
  });
  it("exercícios na ordem da ficha", () => {
    expect(T("A").exercicios.map((e) => e.nome)).toEqual(["Prancha frontal", "Agachamento no Smith", "Leg press 45°", "Cadeira extensora", "Walking Lunges", "Stiff com halteres", "Sled Push", "Abdominal supra na polia em pé"]);
    expect(T("B").exercicios.map((e) => e.nome)).toEqual(["Supino inclinado com halteres", "Puxada frontal aberta (pulley)", "Elevação lateral com halteres", "Battle Rope", "Rosca martelo", "Farmers Carry"]);
    expect(T("C").exercicios.map((e) => e.nome)).toEqual(["Prancha frontal", "Cadeira flexora", "Stiff com barra", "Hip thrust com barra", "Sled Pull", "Agachamento sumô", "Subida no banco (step-up)"]);
    expect(T("D").exercicios.map((e) => e.nome)).toEqual(["Crucifixo na máquina (peck deck)", "Remada sentada pegada aberta", "Tríceps francês com halter", "Rower", "Crucifixo inclinado com halteres", "Ram Thrusters"]);
  });
  it("pirâmides, bi-sets e reps como na ficha", () => {
    expect(E("A", "Agachamento no Smith")).toMatchObject({ tecnica: "piramide", reps: "15/12/10/8" });
    expect(E("A", "Cadeira extensora")).toMatchObject({ tecnica: "biset", bloco: "A1", reps: "20/15/12/10" });
    expect(E("A", "Abdominal supra na polia em pé")).toMatchObject({ tecnica: "piramide", reps: "20/15/12/10" });
    expect(E("C", "Cadeira flexora").reps).toBe("15/12/10/10");
    expect(E("C", "Stiff com barra")).toMatchObject({ tecnica: "normal", reps: "12/12/10/10" });
    expect(E("D", "Crucifixo na máquina (peck deck)").reps).toBe("15/12/10/10");
    expect(E("B", "Rosca martelo")).toMatchObject({ bloco: "B2", series: 4, reps: "10", descanso_seg: 0 });
    expect(E("D", "Ram Thrusters")).toMatchObject({ bloco: "D2", series: 4, reps: "10" });
    expect(E("C", "Subida no banco (step-up)").observacoes).toContain("sandbag");
    expect(E("C", "Agachamento sumô").observacoes).not.toContain("sandbag");
  });
  it("HYROX por tempo (4 × 30 s), em bi-set e fora da regra da falha", () => {
    for (const nome of HYROX) {
      const e = PRESCRICAO.treinos.flatMap((t) => t.exercicios).find((x) => x.nome === nome)!;
      expect(e).toMatchObject({ series: 4, reps: "30s", tecnica: "biset", rir: null, conta_volume: false });
      expect(ehPorTempo(e)).toBe(true);
      expect(e.observacoes ?? "").not.toContain(FALHA);
    }
  });
  it("padrão: até a falha e aquecimento no 1º exercício (prancha fora)", () => {
    expect(E("A", "Prancha frontal")).toMatchObject({ tecnica: "isometria", reps: "60s", series: 2, rir: null });
    expect(E("A", "Agachamento no Smith").observacoes).toContain(AQUECIMENTO);
    expect(E("B", "Supino inclinado com halteres").observacoes).toContain(AQUECIMENTO);
    expect(E("C", "Cadeira flexora").observacoes).toContain(AQUECIMENTO);
    expect(E("D", "Crucifixo na máquina (peck deck)").observacoes).toContain(AQUECIMENTO);
    expect(E("D", "Ram Thrusters").rir).toBe(0);
    expect(E("B", "Puxada frontal aberta (pulley)").observacoes).toContain("barra no peito");
  });
  it("mantém o programa que o personal já tinha para a Ana e deixa a pendência do thruster", () => {
    expect(PRESCRICAO.programa).toMatchObject({ objetivo: "Recomposição corporal", nivel: "Intermediário", split: "Upper / Lower", frequencia: { A: 1, B: 1, C: 1, D: 1 } });
    expect(PRESCRICAO.programa.observacoes).toContain("punhos");
    expect(PENDENCIAS.join(" ")).toContain("Ram thrusters");
  });
  it("aparece só para a Ana Santos", () => {
    expect(prescricoesParaAluno("Ana Santos").map((p) => p.id)).toEqual(["operacao-dublin-hybrid-queen-v1"]);
    expect(prescricoesParaAluno("Leonardo Beltran").map((p) => p.id)).toEqual(["operacao-shape-lutador-v1"]);
  });
});
