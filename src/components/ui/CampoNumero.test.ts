import { describe, expect, it } from "vitest";
import { lerNumero, limparTexto } from "./CampoNumero";

describe("campo de número", () => {
  it("deixa vazio enquanto digita", () => {
    expect(lerNumero("")).toBeNull();
    expect(limparTexto("")).toBe("");
  });
  it("só números (e vírgula no decimal)", () => {
    expect(limparTexto("12a3")).toBe("123");
    expect(limparTexto("42.5", true)).toBe("42,5");
    expect(lerNumero("42,5", true)).toBe(42.5);
    expect(limparTexto("1,234", true)).toBe("1,23");
  });
});
