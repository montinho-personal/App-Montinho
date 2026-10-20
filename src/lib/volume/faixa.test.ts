import { describe, expect, it } from "vitest";
import { lerFaixa, textoFaixa } from "./faixa";

describe("meta de volume digitada", () => {
  it("aceita faixa em vários formatos", () => {
    for (const t of ["8-12", "8 - 12", "8–12", "8 a 12", "8 até 12", "8/12", "8 12"]) expect(lerFaixa(t), t).toEqual({ min: 8, max: 12 });
  });
  it("número único vira mínimo = máximo; ordem invertida é corrigida", () => {
    expect(lerFaixa("12")).toEqual({ min: 12, max: 12 });
    expect(lerFaixa("20-16")).toEqual({ min: 16, max: 20 });
  });
  it("vazio apaga; lixo e exageros são recusados", () => {
    expect(lerFaixa("  ")).toBe("vazio");
    expect(lerFaixa("abc")).toBeNull();
    expect(lerFaixa("8-")).toBeNull();
    expect(lerFaixa("90")).toBeNull();
  });
  it("mostra a faixa como o treinador digita", () => {
    expect(textoFaixa({ min: 8, max: 12 })).toBe("8-12");
    expect(textoFaixa({ min: 20, max: 20 })).toBe("20");
    expect(textoFaixa(undefined)).toBe("");
  });
});
