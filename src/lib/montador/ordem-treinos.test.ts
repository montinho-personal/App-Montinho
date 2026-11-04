import { describe, expect, it } from "vitest";
import { moverTreino } from "./ordem-treinos";

const t = (key: string, letra: "A" | "B" | "C" | "D", nome: string) => ({ key, letra, nome });

describe("moverTreino", () => {
  const lista = [t("1", "A", "Superiores"), t("2", "B", "Inferiores"), t("3", "C", "Superiores 2"), t("4", "D", "Inferiores 2")];
  it("desce o B para C e o C sobe para B", () => {
    const r = moverTreino(lista, "2", 1);
    expect(r.map((x) => `${x.letra}:${x.nome}`)).toEqual(["A:Superiores", "B:Superiores 2", "C:Inferiores", "D:Inferiores 2"]);
    expect(r.find((x) => x.key === "2")?.letra).toBe("C");
  });
  it("sobe o C para B", () => {
    expect(moverTreino(lista, "3", -1).map((x) => x.nome)).toEqual(["Superiores", "Superiores 2", "Inferiores", "Inferiores 2"]);
  });
  it("não mexe nas pontas", () => {
    expect(moverTreino(lista, "1", -1)).toBe(lista);
    expect(moverTreino(lista, "4", 1)).toBe(lista);
  });
});
