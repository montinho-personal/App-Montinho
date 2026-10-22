import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO } from "./operacao-shape-lutador";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO } from "./regras";

const T = (l: string) => PRESCRICAO.treinos.find((t) => t.letra === l)!;
const E = (l: string, nome: string) => T(l).exercicios.find((x) => x.nome === nome)!;

describe("prescrição Operação Shape de Lutador (Leo) — conforme os prints do personal", () => {
  it("passa na validação do montador (zod) e na auditoria", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
    expect(auditarPrescricao(PRESCRICAO).map((t) => t.letra)).toEqual(["A", "B", "C", "D", "E"]);
  });
  it("exercícios na ordem da ficha", () => {
    expect(T("A").exercicios.map((e) => e.nome)).toEqual(["Crucifixo na máquina (peck deck)", "Supino reto com halteres", "Supino inclinado na máquina", "Elevação lateral com halteres", "Tríceps francês na polia", "Abdominal supra na polia em pé"]);
    expect(T("B").exercicios.length).toBe(7);
    expect(T("C").exercicios.map((e) => e.nome)).toEqual(["Prancha frontal", "Cadeira extensora", "Agachamento no Smith", "Leg press horizontal", "Cadeira adutora", "Panturrilha no leg press"]);
    expect(T("D").exercicios.length).toBe(7);
    expect(T("E").exercicios.length).toBe(7);
  });
  it("pirâmides, bi-sets e reps como na ficha", () => {
    expect(E("A", "Abdominal supra na polia em pé")).toMatchObject({ tecnica: "piramide", reps: "20/20/15/15" });
    expect(E("C", "Leg press horizontal").reps).toBe("15/12/10/10");
    expect(E("E", "Hip thrust com barra").reps).toBe("15/12/10/10");
    expect(E("B", "Prancha frontal")).toMatchObject({ tecnica: "isometria", series: 2, reps: "60s" });
    expect(E("D", "Desenvolvimento Arnold")).toMatchObject({ tecnica: "biset", bloco: "D1", series: 4, reps: "12" });
    expect(E("D", "Rosca inclinada com halteres")).toMatchObject({ bloco: "D2", reps: "10" });
    expect(E("B", "Rosca inversa (pegada pronada)").observacoes).toContain("barra reta");
  });
  it("padrão: até a falha e aquecimento no 1º exercício (prancha fora)", () => {
    expect(E("A", "Crucifixo na máquina (peck deck)").observacoes).toContain(AQUECIMENTO);
    expect(E("B", "Puxada frontal supinada").observacoes).toContain(AQUECIMENTO);
    expect(E("B", "Prancha frontal").rir).toBeNull();
    expect(E("C", "Agachamento no Smith").rir).toBe(0);
    expect(E("C", "Panturrilha no leg press").observacoes).toContain("10 repetições isométricas");
  });
  it("aparece só para o Leonardo Beltran", () => {
    expect(prescricoesParaAluno("Leonardo Beltran").map((p) => p.id)).toEqual(["operacao-shape-lutador-v1"]);
  });
});
