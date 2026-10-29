import { describe, expect, it } from "vitest";
import { antesDepois, chaveExtra, extraValida, normalizarLeitura } from "./leitura";

describe("leitura do arquivo de avaliação", () => {
  it("ordena antes → depois, junta a mesma data e ignora data futura ou inválida", () => {
    const r = normalizarLeitura(
      [
        { data: "2026-10-01", medidas: { peso_kg: 68.4, cintura_cm: "72,5" }, extras: [{ nome: "Braço direito", valor: 29, unidade: "cm" }] },
        { data: "2026-07-01", medidas: { peso_kg: 71 }, extras: [] },
        { data: "2026-07-01", medidas: { quadril_cm: 101 }, extras: [{ nome: "Braço  direito", valor: 30.5, unidade: "CM" }] },
        { data: "2026-12-01", medidas: { peso_kg: 60 } },
        { data: "2026-02-30", medidas: { peso_kg: 60 } },
      ],
      "2026-10-29"
    );
    expect(r.map((a) => a.data)).toEqual(["2026-07-01", "2026-10-01"]);
    expect(r[0].medidas).toEqual({ peso_kg: 71, quadril_cm: 101 });
    expect(r[0].extras).toEqual([{ nome: "Braço direito", valor: 30.5, unidade: "cm" }]);
    expect(r[1].medidas.cintura_cm).toBe(72.5);
  });
  it("número fora do limite não some: vira extra para conferir", () => {
    const r = normalizarLeitura([{ data: "2026-10-01", medidas: { braco_cm: 290 } }], "2026-10-29");
    expect(r[0].medidas.braco_cm).toBeUndefined();
    expect(r[0].extras[0]).toEqual({ nome: "Braço (conferir)", valor: 290, unidade: "cm" });
  });
  it("extra sem nome ou sem número é descartada", () => {
    expect(extraValida({ nome: "", valor: 3 })).toBeNull();
    expect(extraValida({ nome: "Dobra", valor: "abc" })).toBeNull();
    expect(extraValida({ nome: "Dobra tricipital", valor: "12,4", unidade: "mm" })).toEqual({ nome: "Dobra tricipital", valor: 12.4, unidade: "mm" });
    expect(chaveExtra("Braço Direito (relaxado)")).toBe("braco direito relaxado");
  });
  it("antes × depois com campos do app e extras de mesmo nome", () => {
    const l = antesDepois(
      { data: "2026-07-01", peso_kg: 71, cintura_cm: 75, altura_cm: 165, extras: [{ nome: "Braço direito", valor: 30.5, unidade: "cm" }] },
      { data: "2026-10-01", peso_kg: 68.4, cintura_cm: 72.5, extras: [{ nome: "braço direito", valor: 29, unidade: "cm" }, { nome: "Pescoço", valor: 31, unidade: "cm" }] }
    );
    expect(l.find((x) => x.chave === "peso_kg")?.diferenca).toBe(-2.6);
    expect(l.some((x) => x.chave === "altura_cm")).toBe(false);
    expect(l.find((x) => x.chave === "extra:braco direito")).toMatchObject({ antes: 30.5, depois: 29, diferenca: -1.5 });
    expect(l.find((x) => x.chave === "extra:pescoco")).toMatchObject({ antes: null, depois: 31, diferenca: null });
  });
});
