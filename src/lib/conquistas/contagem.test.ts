import { describe, expect, it } from "vitest";
import { contagemDeTrofeus } from "./contagem";
import type { Medalha } from "./vitrine";

const m = (codigo: string, conquistada: boolean) => ({ codigo, conquistada }) as unknown as Medalha;

describe("contagem única de troféus", () => {
  it("o recorde (fora da coleção) entra 1 vez e o número bate com o ranking", () => {
    const medalhas = [m("primeiro_treino", true), m("treinos_10", true), m("treinos_25", false)];
    const conquistas = [{ codigo: "primeiro_treino" }, { codigo: "treinos_10" }, { codigo: "recorde" }, { codigo: "recorde" }];
    const c = contagemDeTrofeus(medalhas, conquistas);
    expect(c).toMatchObject({ ganhos: 3, total: 4, noRanking: 3, foraDoRanking: 0, extras: 1 });
  });
  it("Multimodalidade aparece na coleção, mas fica fora do ranking", () => {
    const c = contagemDeTrofeus([m("primeiro_treino", true), m("primeiro_wod", true)], [{ codigo: "primeiro_treino" }, { codigo: "primeiro_wod" }]);
    expect(c).toMatchObject({ ganhos: 2, noRanking: 1, foraDoRanking: 1 });
  });
});
