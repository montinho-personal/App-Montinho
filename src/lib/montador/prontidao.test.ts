import { describe, expect, it } from "vitest";
import { prontidaoDoProtocolo, type EntradaProntidao } from "./prontidao";

const ex = (nome: string, series = 3, reps = "10", alerta = false) => ({ nome, series, reps, alerta });
const base: EntradaProntidao = {
  nomeProtocolo: "Operação Fênix",
  split: "ABC",
  fase: "adaptacao",
  treinos: [
    { letra: "A", ativo: true, frequencia: 1, exercicios: [ex("Supino"), ex("Remada")] },
    { letra: "B", ativo: true, frequencia: 1, exercicios: [ex("Agachamento")] },
    { letra: "C", ativo: false, frequencia: 0, exercicios: [] },
  ],
};

describe("prontidão do protocolo", () => {
  it("tudo configurado = pronto, sem itens pendentes", () => {
    const r = prontidaoDoProtocolo(base);
    expect(r.pronto).toBe(true);
    expect(r.prontos).toBe(r.total);
  });
  it("treino ativo vazio, fora da semana e exercício sem reps aparecem, com o detalhe", () => {
    const r = prontidaoDoProtocolo({ ...base, treinos: [{ letra: "A", ativo: true, frequencia: 0, exercicios: [ex("Supino", 3, "")] }, { letra: "B", ativo: true, frequencia: 1, exercicios: [ex("")] }] });
    expect(r.pronto).toBe(false);
    const por = Object.fromEntries(r.itens.map((i) => [i.id, i]));
    expect(por.exercicios.detalhe).toBe("Sem exercícios: B");
    expect(por.calendario.detalhe).toBe("Fora da semana: A");
    expect(por.series.ok).toBe(false);
  });
  it("opcionais não impedem o “pronto” (fase, nome, ⚠)", () => {
    const r = prontidaoDoProtocolo({ ...base, fase: "", nomeProtocolo: "Programa atual", treinos: [{ letra: "A", ativo: true, frequencia: 2, exercicios: [ex("Stiff", 3, "10", true)] }] });
    expect(r.pronto).toBe(true);
    expect(r.prontos).toBeLessThan(r.total);
    expect(r.itens.find((i) => i.id === "restricoes")!.detalhe).toContain("Stiff");
  });
  it("treino inativo vazio não conta como pendência", () => {
    expect(prontidaoDoProtocolo(base).itens.find((i) => i.id === "exercicios")!.ok).toBe(true);
  });
});
