import { describe, expect, it } from "vitest";
import { listarSeries, verificarPendencias } from "./pendencias";

const s = (serie: number, concluida: boolean, carga = "", reps = "", tipo = "valida") => ({ serie, tipo, concluida, carga, reps });

describe("conferência ao concluir o treino", () => {
  it("lista as séries válidas sem marcar e separa as que já foram preenchidas", () => {
    const p = verificarPendencias(
      [{ seId: "a", nome: "Supino" }, { seId: "b", nome: "Remada" }],
      { a: [s(1, true, "40", "10"), s(2, false, "40", "9"), s(3, false)], b: [s(1, true), s(2, true)] }
    );
    expect(p).toEqual([{ seId: "a", nome: "Supino", faltam: [2, 3], preenchidas: [2] }]);
  });

  it("tudo marcado: nenhuma pendência", () => {
    expect(verificarPendencias([{ seId: "a", nome: "Supino" }], { a: [s(1, true), s(2, true)] })).toEqual([]);
  });

  it("aquecimento e exercícios pulados ou 'não consegui' não contam", () => {
    const p = verificarPendencias(
      [{ seId: "a", nome: "Supino", status: "pulado" }, { seId: "b", nome: "Remada", status: "nao_consegui" }, { seId: "c", nome: "Rosca" }],
      { a: [s(1, false)], b: [s(1, false)], c: [s(1, false, "", "", "aquecimento"), s(2, true)] }
    );
    expect(p).toEqual([]);
  });

  it("texto em português", () => {
    expect(listarSeries([3])).toBe("série 3");
    expect(listarSeries([3, 4])).toBe("séries 3 e 4");
    expect(listarSeries([2, 3, 4])).toBe("séries 2, 3 e 4");
  });
});
