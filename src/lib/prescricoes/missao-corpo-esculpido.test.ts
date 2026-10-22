import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO, PENDENCIAS } from "./missao-corpo-esculpido";
import { prescricoesParaAluno } from "./index";
import { frequenciaDoCalendario, type Calendario } from "@/lib/volume/calcular";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => aud.find((t) => t.letra === l)!;
const E = (l: string, nome: string) => PRESCRICAO.treinos.find((t) => t.letra === l)!.exercicios.find((x) => x.nome === nome)!;

describe("prescrição Missão Corpo Esculpido & Punhos de Aço (Naya) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
  });

  it("nome do protocolo e 6 treinos em sequência (Seg a Sáb)", () => {
    expect(PRESCRICAO.programa.nome).toBe("Missão Corpo Esculpido & Punhos de Aço");
    expect(aud.map((t) => t.letra)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(frequenciaDoCalendario(PRESCRICAO.programa.calendario as Calendario)).toEqual({ A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 });
  });

  it("exercícios na ordem da ficha", () => {
    expect(T("A").itens.map((i) => i.nome)).toEqual(["Prancha frontal", "Cadeira extensora", "Agachamento no Smith", "Leg press 45°", "Cadeira abdutora", "Hip thrust com barra"]);
    expect(T("E").itens.map((i) => i.nome)).toEqual(["Leg press horizontal", "Agachamento búlgaro", "Cadeira flexora", "Mesa flexora", "Cadeira abdutora"]);
    expect(PRESCRICAO.treinos.find((t) => t.letra === "F")!.exercicios.length).toBe(9);
  });

  it("pirâmides, bi-sets, reps e RIR como na ficha", () => {
    expect(E("A", "Prancha frontal")).toMatchObject({ tecnica: "isometria", series: 2, reps: "60s" });
    expect(E("A", "Agachamento no Smith")).toMatchObject({ tecnica: "piramide", reps: "15/12/10/8", rir: 3 });
    expect(E("B", "Desenvolvimento Arnold")).toMatchObject({ tecnica: "biset", bloco: "B1", reps: "12/12/10/10" });
    expect(E("C", "Stiff com barra").reps).toBe("12/12/10/8");
    expect(E("C", "Abdominal supra na polia em pé")).toMatchObject({ series: 4, reps: "20", rir: null });
    expect(E("D", "Tríceps testa na polia com barra reta")).toMatchObject({ series: 4, reps: "12", rir: null });
    expect(E("F", "Rosca inversa (pegada pronada)")).toMatchObject({ tecnica: "biset", bloco: "F2", series: 3 });
  });

  it("descansos pelo padrão do Montinho, bi-sets sem descanso entre os exercícios", () => {
    for (const t of PRESCRICAO.treinos)
      for (const x of t.exercicios) {
        if (x.tecnica === "biset" && x.descanso_seg === 0) expect(x.descanso_apos_seg).toBe(0);
        else expect(x.descanso_seg).toBeNull();
      }
  });

  it("aparece só para a Naya e lista o que precisa de confirmação", () => {
    expect(prescricoesParaAluno("Naya Martins Ribeiro de Oliveira").map((p) => p.id)).toEqual(["missao-corpo-esculpido-v1"]);
    expect(prescricoesParaAluno("Natalia Cristina Nascimento").map((p) => p.id)).not.toContain("missao-corpo-esculpido-v1");
    expect(PENDENCIAS.some((p) => /búlgaro/.test(p))).toBe(true);
  });
});
