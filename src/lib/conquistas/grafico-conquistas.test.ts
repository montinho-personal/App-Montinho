import { describe, expect, it } from "vitest";
import { barrasDeConquistas, fraseDaTendencia, inicioDoPeriodo } from "./grafico-conquistas";

describe("gráfico de conquistas do Celebrar", () => {
  it("acha o começo de cada período", () => {
    expect(inicioDoPeriodo("2026-11-01", "semana")).toBe("2026-10-26");
    expect(inicioDoPeriodo("2026-10-15", "quinzena")).toBe("2026-10-01");
    expect(inicioDoPeriodo("2026-10-16", "quinzena")).toBe("2026-10-16");
    expect(inicioDoPeriodo("2026-10-31", "mes")).toBe("2026-10-01");
  });
  it("conta por período no dia de Brasília e marca o atual", () => {
    const itens = [
      { em: "2026-10-27T12:00:00Z", alunoId: "a" },
      { em: "2026-10-28T12:00:00Z", alunoId: "a" },
      { em: "2026-10-20T12:00:00Z", alunoId: "b" },
      { em: "2026-10-26T02:00:00Z", alunoId: "c" }, // 25/10 às 23h em Brasília: semana anterior
    ];
    const b = barrasDeConquistas(itens, "semana", "2026-11-01", 3);
    expect(b.map((x) => x.inicio)).toEqual(["2026-10-12", "2026-10-19", "2026-10-26"]);
    expect(b.map((x) => x.total)).toEqual([0, 2, 2]);
    expect(b[2]).toMatchObject({ pessoas: 1, atual: true });
  });
  it("quinzenas e meses atravessam o ano", () => {
    expect(barrasDeConquistas([], "quinzena", "2027-01-05", 3).map((x) => x.inicio)).toEqual(["2026-12-01", "2026-12-16", "2027-01-01"]);
    expect(barrasDeConquistas([], "mes", "2027-01-05", 3).map((x) => x.rotulo)).toEqual(["nov/26", "dez/26", "jan/27"]);
  });
  it("compara os dois últimos períodos fechados", () => {
    const b = [
      { inicio: "x", rotulo: "", total: 10, pessoas: 1, atual: false },
      { inicio: "y", rotulo: "", total: 15, pessoas: 1, atual: false },
      { inicio: "z", rotulo: "", total: 2, pessoas: 1, atual: true },
    ];
    expect(fraseDaTendencia(b, "semana")).toBe("Na semana passada: 15 conquistas, ↑ 50% em relação à semana anterior.");
    expect(fraseDaTendencia(b, "mes")).toBe("No mês passado: 15 conquistas, ↑ 50% em relação ao mês anterior.");
  });
});
